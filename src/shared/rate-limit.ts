import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/shared/db/connection";

/** Fixed windows are shared across serverless instances; raw emails/IPs are never stored. */
export async function allowRequest(
  scope: string,
  identity: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const window = Math.floor(Date.now() / windowMs);
  const key = createHash("sha256").update(`${scope}:${identity}:${window}`).digest("hex");
  const row = await prisma.rateLimit.upsert({
    where: { key },
    create: { key, expiresAt: new Date((window + 1) * windowMs) },
    update: { count: { increment: 1 } },
  });
  return row.count <= limit;
}
