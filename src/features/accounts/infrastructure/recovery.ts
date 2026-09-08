import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/shared/db/connection";
import { allowRequest } from "@/shared/rate-limit";
import { sendEmail } from "@/shared/email/mailer";
import { logger } from "@/shared/logger";
import { fail, ok } from "@/core/domain/result";
import { validatePassword } from "../domain/password";
import { BcryptPasswordHasher } from "./bcrypt-hasher";

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function requestPasswordReset(email: string, ip: string) {
  const parsed = z.email().max(120).safeParse(email.trim().toLowerCase());
  if (!parsed.success) return fail("INVALID_EMAIL", "Enter a valid email address.");
  const [ipAllowed, emailAllowed] = await Promise.all([
    allowRequest("reset-ip", ip, 20, 3600000),
    allowRequest("reset-email", parsed.data, 3, 3600000),
  ]);
  if (!ipAllowed || !emailAllowed) return ok(null);
  const user = await prisma.user.findUnique({
    where: { email: parsed.data },
    select: { id: true, email: true, suspendedAt: true },
  });
  if (!user || user.suspendedAt) return ok(null);
  const token = randomBytes(32).toString("hex");
  const row = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + 30 * 60000),
      },
    });
  });
  const result = await sendEmail({
    to: user.email,
    key: `reset/${row.id}`,
    subject: "Reset your Campus Loop password",
    body: "Use this link to choose a new password. It expires in 30 minutes. If you did not request this, you can ignore this email.",
    path: `/reset-password#token=${token}`,
  });
  if (!result.id)
    logger.error(
      { resetRequestId: row.id, reason: result.error },
      "Password reset email was not accepted",
    );
  return ok(null);
}

export async function resetPassword(token: string, password: string, ip: string) {
  if (!/^[a-f0-9]{64}$/.test(token))
    return fail(
      "INVALID_TOKEN",
      "This reset link is invalid or has expired. Request another one.",
    );
  const invalid = validatePassword(password);
  if (invalid) return fail("INVALID_PASSWORD", invalid);
  if (!(await allowRequest("reset-consume", ip, 30, 3600000)))
    return fail("RATE_LIMIT", "Too many attempts. Try again later.");
  const passwordHash = await new BcryptPasswordHasher().hash(password);
  return prisma.$transaction(async (tx) => {
    const tokenHash = digest(token);
    const reset = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!reset)
      return fail(
        "INVALID_TOKEN",
        "This reset link is invalid or has expired. Request another one.",
      );
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${reset.userId} FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id: reset.userId },
      select: { suspendedAt: true },
    });
    if (!user || user.suspendedAt)
      return fail(
        "INVALID_TOKEN",
        "This reset link is invalid or has expired. Request another one.",
      );
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (!consumed.count)
      return fail(
        "INVALID_TOKEN",
        "This reset link is invalid or has expired. Request another one.",
      );
    await tx.user.update({
      where: { id: reset.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: reset.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    return ok(null);
  });
}

export async function getEmailPreferences(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { messageEmails: true, dealEmails: true },
  });
}

export async function updateEmailPreferences(
  userId: string,
  messageEmails: boolean,
  dealEmails: boolean,
) {
  await prisma.user.update({ where: { id: userId }, data: { messageEmails, dealEmails } });
}
