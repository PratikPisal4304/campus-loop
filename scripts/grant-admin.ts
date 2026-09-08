import { prisma } from "../src/shared/db/connection";
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run admin:grant -- existing-student@example.com");
  const changed = await prisma.user.updateMany({
    where: { email },
    data: { role: "admin", suspendedAt: null, sessionVersion: { increment: 1 } },
  });
  if (!changed.count) throw new Error("No account has that email. Register the account first.");
  process.stdout.write("Administrator access granted. Sign in again to open /admin.\n");
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
