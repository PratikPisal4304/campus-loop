import "server-only";
import { prisma } from "@/shared/db/connection";
import type { TransactionClient } from "@/shared/db/transaction";
import { sendEmail } from "./mailer";

export interface Notification {
  userId: string;
  eventKey: string;
  kind: "message" | "deal";
  subject: string;
  body: string;
  path: string;
}

export async function queueEmail(tx: TransactionClient, input: Notification): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { suspendedAt: true, messageEmails: true, dealEmails: true },
  });
  if (
    !user ||
    user.suspendedAt ||
    !(input.kind === "message" ? user.messageEmails : user.dealEmails)
  )
    return;
  await tx.emailJob.upsert({ where: { eventKey: input.eventKey }, create: input, update: {} });
}

/** Bounded work for Next's after(). A lease and provider key protect concurrent workers. */
export async function dispatchEmails(): Promise<void> {
  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000);
  const stale = new Date(Date.now() - 2 * 60 * 1000);
  await prisma.emailJob.updateMany({
    where: { status: "sending", updatedAt: { lt: stale } },
    data: { status: "failed", lastError: "Worker interrupted; retry available for 23 hours." },
  });
  const jobs = await prisma.emailJob.findMany({
    where: { status: "queued", createdAt: { gt: cutoff } },
    orderBy: { createdAt: "asc" },
    take: 8,
    include: {
      user: {
        select: { email: true, suspendedAt: true, messageEmails: true, dealEmails: true },
      },
    },
  });
  await Promise.all(
    jobs.map(async (job) => {
      const claimed = await prisma.emailJob.updateMany({
        where: { id: job.id, status: "queued" },
        data: { status: "sending" },
      });
      if (!claimed.count) return;
      if (
        job.user.suspendedAt ||
        !(job.kind === "message" ? job.user.messageEmails : job.user.dealEmails)
      ) {
        await prisma.emailJob.update({ where: { id: job.id }, data: { status: "skipped" } });
        return;
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await sendEmail({
          to: job.user.email,
          subject: job.subject,
          body: job.body,
          path: job.path,
          key: job.eventKey,
        });
        await prisma.emailJob.update({
          where: { id: job.id },
          data: {
            attempts: { increment: 1 },
            status: result.id
              ? "accepted"
              : attempt === 2 ||
                  result.error?.includes("disabled") ||
                  result.error?.includes("configured")
                ? "failed"
                : "sending",
            providerId: result.id,
            lastError: result.error,
          },
        });
        if (
          result.id ||
          result.error?.includes("disabled") ||
          result.error?.includes("configured")
        )
          break;
      }
    }),
  );
}
