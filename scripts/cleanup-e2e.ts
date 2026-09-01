/**
 * Removes rows the Playwright suite creates when it is pointed at a shared database.
 *
 * The e2e specs register throwaway students (`robin.<timestamp>.<n>@campus.edu`) and
 * publish timestamped listings. Deleting the user cascades to their listings, saves,
 * conversations and messages, so the demo data is left as the seed script wrote it.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function cleanup(): Promise<void> {
  const connectionString = process.env.DATABASE_URL ?? "";
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const users = await prisma.user.findMany({
    where: { email: { startsWith: "robin." } },
    select: { id: true, email: true },
  });

  const listings = await prisma.listing.findMany({
    where: {
      OR: [
        { title: { contains: "Casio FX-82MS calculator " } },
        { title: { contains: "Chemistry notes " } },
      ],
    },
    select: { id: true, title: true },
  });

  await prisma.listing.deleteMany({ where: { id: { in: listings.map((row) => row.id) } } });
  await prisma.user.deleteMany({ where: { id: { in: users.map((row) => row.id) } } });

  process.stdout.write(`Removed ${users.length} test students, ${listings.length} listings\n`);
  const [remainingUsers, remainingListings] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
  ]);
  process.stdout.write(
    `Remaining: ${remainingUsers} students, ${remainingListings} listings\n`,
  );

  await prisma.$disconnect();
}

cleanup().catch((error: unknown) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
