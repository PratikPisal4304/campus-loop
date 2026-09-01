/**
 * Seed the database with a believable campus.
 *
 * Idempotent: users are upserted by email and listings by slug, so running it twice does
 * not duplicate anything and re-running after a schema change refreshes the data in place.
 *
 * Run with:  npm run db:seed
 * (the --conditions=react-server flag in that script is required, or `server-only` throws)
 */
import bcrypt from "bcryptjs";
import { toEntityId, toSlug, type Slug } from "../src/core/types/branded";
import {
  swatchForKey,
  type Category,
  type Condition,
  type Mode,
  type RentUnit,
} from "../src/features/listings/domain/listing";
import { conversationKey } from "../src/features/messaging/domain/conversation";
import { prisma } from "../src/shared/db/connection";

const PASSWORD = process.env.SEED_PASSWORD ?? "campus1234";

const STUDENTS = [
  {
    name: "Alex Rivera",
    email: "alex@campus.edu",
    area: "North Quad",
    bio: "Third-year mechanical engineering. Mostly selling lab gear I've finished with.",
  },
  {
    name: "Priya Nair",
    email: "priya@campus.edu",
    area: "Library Steps",
    bio: "Electronics and embedded systems. I rent out my kits between projects.",
  },
  {
    name: "Sam Okafor",
    email: "sam@campus.edu",
    area: "Hostel C Gate",
    bio: "Architecture. Drafting tools and a lot of very heavy books.",
  },
  {
    name: "Mei Tanaka",
    email: "mei@campus.edu",
    area: "Science Block",
    bio: "Chemistry postgrad. Lab coats, glassware, good notes.",
  },
  {
    name: "Diego Santos",
    email: "diego@campus.edu",
    area: "Sports Complex",
    bio: "Civil engineering, second year.",
  },
  {
    name: "Fatima Khan",
    email: "fatima@campus.edu",
    area: "Arts Building",
    bio: "Design student. Selling art supplies I over-bought in first year.",
  },
  {
    name: "Tom Bergen",
    email: "tom@campus.edu",
    area: "Main Canteen",
    bio: "CS. I mostly give away things I no longer need.",
  },
  {
    name: "Anika Roy",
    email: "anika@campus.edu",
    area: "North Quad",
    bio: "Maths and stats. Textbooks, calculators, handwritten notes.",
  },
] as const;

interface SeedListing {
  seller: string;
  title: string;
  description: string;
  category: Category;
  condition: Condition;
  mode: Mode;
  rupees: number;
  rentUnit?: RentUnit;
  pickup: string;
}

const LISTINGS: SeedListing[] = [
  {
    seller: "alex@campus.edu",
    title: "TI-84 Plus CE graphing calculator",
    description:
      "Used it for two years of engineering maths. Screen is perfect, comes with the charging cable and the slide cover. Batteries hold a full week of classes.",
    category: "calculators",
    condition: "like-new",
    mode: "sell",
    rupees: 5200,
    pickup: "North Quad",
  },
  {
    seller: "alex@campus.edu",
    title: "Vernier caliper, stainless 150mm",
    description:
      "Standard 0.02mm caliper from the mechanical lab list. Zeroes correctly, no play in the jaws. Includes the case.",
    category: "lab",
    condition: "good",
    mode: "sell",
    rupees: 750,
    pickup: "North Quad",
  },
  {
    seller: "alex@campus.edu",
    title: "Engineering drawing board with stand",
    description:
      "A2 board with a parallel rule. Bulky to carry so pickup only. Happy to swap for a decent scientific calculator.",
    category: "engineering",
    condition: "used",
    mode: "exchange",
    rupees: 0,
    pickup: "North Quad",
  },
  {
    seller: "priya@campus.edu",
    title: "Arduino Uno R3 starter kit",
    description:
      "Full kit — Uno board, breadboard, jumper wires, servo, sensors, LEDs, resistors. Everything is in the box and the board is tested working.",
    category: "projects",
    condition: "like-new",
    mode: "sell",
    rupees: 2100,
    pickup: "Library Steps",
  },
  {
    seller: "priya@campus.edu",
    title: "Digital oscilloscope, 2 channel",
    description:
      "Renting between my own projects. 100MHz, both probes included. Deposit refunded on return in the same condition.",
    category: "electronics",
    condition: "good",
    mode: "rent",
    rupees: 900,
    rentUnit: "week",
    pickup: "Library Steps",
  },
  {
    seller: "priya@campus.edu",
    title: "Raspberry Pi 4 (4GB) with case",
    description:
      "Includes the official power supply, a heatsink case and a 32GB card with Raspberry Pi OS already on it.",
    category: "electronics",
    condition: "good",
    mode: "sell",
    rupees: 4300,
    pickup: "Library Steps",
  },
  {
    seller: "priya@campus.edu",
    title: "Soldering station, adjustable",
    description:
      "60W with temperature control, a stand and a fresh tip. Rent it for a project week rather than buying one.",
    category: "electronics",
    condition: "good",
    mode: "rent",
    rupees: 250,
    rentUnit: "week",
    pickup: "Library Steps",
  },
  {
    seller: "sam@campus.edu",
    title: "Rotring drafting set, 9 pieces",
    description:
      "Compass, dividers, extension bar, the lot. One spare lead tube still sealed. A serious set that will outlast the degree.",
    category: "engineering",
    condition: "like-new",
    mode: "sell",
    rupees: 1800,
    pickup: "Hostel C Gate",
  },
  {
    seller: "sam@campus.edu",
    title: "Ching — Architecture: Form, Space, and Order",
    description:
      "The 4th edition. Some pencil marks in the first two chapters, otherwise clean and unbroken spine.",
    category: "books",
    condition: "good",
    mode: "sell",
    rupees: 1150,
    pickup: "Hostel C Gate",
  },
  {
    seller: "sam@campus.edu",
    title: "A1 portfolio carry case",
    description:
      "Zip case for carrying drawings across campus without them getting wrecked in the rain. Slight scuff on one corner.",
    category: "art",
    condition: "used",
    mode: "sell",
    rupees: 600,
    pickup: "Hostel C Gate",
  },
  {
    seller: "mei@campus.edu",
    title: "Lab coat, size M",
    description:
      "Washed and pressed. Full length, two pockets, no burns or stains. I have moved to a lab that supplies them.",
    category: "lab",
    condition: "like-new",
    mode: "sell",
    rupees: 450,
    pickup: "Science Block",
  },
  {
    seller: "mei@campus.edu",
    title: "Organic chemistry notes — full year",
    description:
      "My complete handwritten notes with reaction mechanisms drawn out properly. Giving these away, they did their job.",
    category: "notes",
    condition: "good",
    mode: "free",
    rupees: 0,
    pickup: "Science Block",
  },
  {
    seller: "mei@campus.edu",
    title: "Borosilicate glassware set",
    description:
      "Two beakers, a conical flask, a measuring cylinder and a funnel. No chips or cracks — checked each one.",
    category: "lab",
    condition: "good",
    mode: "sell",
    rupees: 900,
    pickup: "Science Block",
  },
  {
    seller: "mei@campus.edu",
    title: "Safety goggles and nitrile gloves",
    description:
      "Unused spare goggles plus most of a box of gloves. Free to whoever needs them for the first-year labs.",
    category: "lab",
    condition: "new",
    mode: "free",
    rupees: 0,
    pickup: "Science Block",
  },
  {
    seller: "diego@campus.edu",
    title: "Casio FX-991EX scientific calculator",
    description:
      "The one that is actually allowed in exams. All functions work, the case is a bit scratched.",
    category: "calculators",
    condition: "good",
    mode: "sell",
    rupees: 1100,
    pickup: "Sports Complex",
  },
  {
    seller: "diego@campus.edu",
    title: "Surveying tripod and staff",
    description:
      "For the field weeks. Renting rather than selling since I still need it next semester.",
    category: "engineering",
    condition: "good",
    mode: "rent",
    rupees: 400,
    rentUnit: "week",
    pickup: "Sports Complex",
  },
  {
    seller: "diego@campus.edu",
    title: "Concrete technology textbook set",
    description:
      "Three books for the materials module. Would rather swap them for structural analysis texts than sell.",
    category: "books",
    condition: "good",
    mode: "exchange",
    rupees: 0,
    pickup: "Sports Complex",
  },
  {
    seller: "fatima@campus.edu",
    title: "Copic marker set, 36 colours",
    description:
      "Barely touched. I bought the big set and use maybe eight of them. All caps present, all still juicy.",
    category: "art",
    condition: "like-new",
    mode: "sell",
    rupees: 6800,
    pickup: "Arts Building",
  },
  {
    seller: "fatima@campus.edu",
    title: "Wacom Intuos drawing tablet",
    description:
      "Small size, USB-C, with the pen and two spare nibs. Works on Mac and Windows, no issues.",
    category: "art",
    condition: "good",
    mode: "sell",
    rupees: 3900,
    pickup: "Arts Building",
  },
  {
    seller: "fatima@campus.edu",
    title: "A3 cutting mat and craft knife",
    description:
      "Self-healing mat, still flat. Knife has a fresh blade in it. Giving away, I have two.",
    category: "art",
    condition: "used",
    mode: "free",
    rupees: 0,
    pickup: "Arts Building",
  },
  {
    seller: "fatima@campus.edu",
    title: "Studio easel",
    description:
      "Wooden A-frame easel, adjusts to standing height. Renting it out over the holidays.",
    category: "art",
    condition: "good",
    mode: "rent",
    rupees: 300,
    rentUnit: "month",
    pickup: "Arts Building",
  },
  {
    seller: "tom@campus.edu",
    title: "Mechanical keyboard, brown switches",
    description:
      "TKL layout, USB-C, no missing keycaps. Slightly worn shine on WASD from too much of one game.",
    category: "electronics",
    condition: "good",
    mode: "sell",
    rupees: 2400,
    pickup: "Main Canteen",
  },
  {
    seller: "tom@campus.edu",
    title: "Cormen — Introduction to Algorithms",
    description:
      "The big one. Heavy, intact, a few sticky tabs left in the dynamic programming chapter.",
    category: "books",
    condition: "good",
    mode: "sell",
    rupees: 1600,
    pickup: "Main Canteen",
  },
  {
    seller: "tom@campus.edu",
    title: "Data structures notes, second year",
    description: "Typed up and printed. Free — someone may as well get use out of them.",
    category: "notes",
    condition: "good",
    mode: "free",
    rupees: 0,
    pickup: "Main Canteen",
  },
  {
    seller: "tom@campus.edu",
    title: "USB logic analyser, 8 channel",
    description:
      "Works with Sigrok and Saleae software. Happy to swap for a decent multimeter.",
    category: "projects",
    condition: "good",
    mode: "exchange",
    rupees: 0,
    pickup: "Main Canteen",
  },
  {
    seller: "tom@campus.edu",
    title: "Monitor stand, adjustable",
    description: "Metal riser, holds up to 27 inch. Free to a good desk.",
    category: "electronics",
    condition: "used",
    mode: "free",
    rupees: 0,
    pickup: "Main Canteen",
  },
  {
    seller: "anika@campus.edu",
    title: "Casio FX-991ES Plus",
    description: "My backup calculator, exam approved. Sliding cover, no dead pixels.",
    category: "calculators",
    condition: "good",
    mode: "sell",
    rupees: 850,
    pickup: "North Quad",
  },
  {
    seller: "anika@campus.edu",
    title: "Statistics for Engineers, 6th ed.",
    description: "Clean copy, no marks. Covers the whole probability and inference module.",
    category: "books",
    condition: "like-new",
    mode: "sell",
    rupees: 1350,
    pickup: "North Quad",
  },
  {
    seller: "anika@campus.edu",
    title: "Linear algebra handwritten notes",
    description:
      "Two full notebooks, worked examples for every theorem. Would swap for good calculus notes.",
    category: "notes",
    condition: "good",
    mode: "exchange",
    rupees: 0,
    pickup: "North Quad",
  },
  {
    seller: "anika@campus.edu",
    title: "Scientific calculator — bulk, 3 units",
    description:
      "Three basic scientific calculators from a study group that has finished. Renting them out per semester.",
    category: "calculators",
    condition: "used",
    mode: "rent",
    rupees: 150,
    rentUnit: "month",
    pickup: "North Quad",
  },
  {
    seller: "alex@campus.edu",
    title: "Digital multimeter with probes",
    description:
      "Auto-ranging, measures continuity, capacitance and temperature. Fresh battery.",
    category: "electronics",
    condition: "good",
    mode: "sell",
    rupees: 1250,
    pickup: "North Quad",
  },
  {
    seller: "sam@campus.edu",
    title: "Model-making kit — foam board and pins",
    description:
      "Leftover foam board, balsa strips, pins and glue from my final model. Free to any first year.",
    category: "projects",
    condition: "used",
    mode: "free",
    rupees: 0,
    pickup: "Hostel C Gate",
  },
];

async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const userIds = new Map<string, string>();
  for (const student of STUDENTS) {
    const user = await prisma.user.upsert({
      where: { email: student.email },
      update: {
        name: student.name,
        passwordHash,
        bio: student.bio,
        campusArea: student.area,
        role: "student",
      },
      // Ratings are only set on insert — re-running should not keep inflating them.
      create: {
        name: student.name,
        email: student.email,
        passwordHash,
        bio: student.bio,
        campusArea: student.area,
        role: "student",
        ratingSum: Math.floor(Math.random() * 8) + 12,
        ratingCount: Math.floor(Math.random() * 2) + 3,
      },
      select: { id: true },
    });
    userIds.set(student.email, user.id);
  }
  process.stdout.write(`Seeded ${userIds.size} students\n`);

  const listingIds: string[] = [];
  for (const item of LISTINGS) {
    const sellerId = userIds.get(item.seller);
    if (!sellerId) continue;

    const slug = toSlug(item.title) as Slug;
    // The domain forbids a price on free/exchange listings; the seed obeys the same rule
    // it enforces at runtime, or it would create data the app rejects on edit.
    const pricePaise = item.mode === "sell" || item.mode === "rent" ? item.rupees * 100 : 0;

    const fields = {
      title: item.title,
      description: item.description,
      category: item.category,
      condition: item.condition,
      mode: item.mode,
      pricePaise,
      rentUnit: item.mode === "rent" ? (item.rentUnit ?? "week") : null,
      pickupArea: item.pickup,
      swatch: swatchForKey(slug),
      sellerId,
      status: "active",
    };

    const listing = await prisma.listing.upsert({
      where: { slug },
      update: fields,
      create: { slug, ...fields },
      select: { id: true },
    });
    listingIds.push(listing.id);
  }
  process.stdout.write(`Seeded ${listingIds.length} listings\n`);

  // A couple of saved items and one live conversation, so the empty states are not the
  // first thing you see in a demo.
  const alex = userIds.get("alex@campus.edu");
  const priya = userIds.get("priya@campus.edu");
  const arduino = await prisma.listing.findUnique({
    where: { slug: toSlug("Arduino Uno R3 starter kit") },
    select: { id: true },
  });

  if (alex && priya && arduino) {
    for (const listingId of listingIds.slice(3, 6)) {
      await prisma.savedItem.upsert({
        where: { userId_listingId: { userId: alex, listingId } },
        update: {},
        create: { userId: alex, listingId },
      });
    }

    const pairKey = conversationKey(toEntityId(arduino.id), [
      toEntityId(alex),
      toEntityId(priya),
    ]);
    const lastMessage = "Perfect — see you at the Library Steps at 4.";

    const conversation = await prisma.conversation.upsert({
      where: { pairKey },
      update: { lastMessagePreview: lastMessage, lastMessageAt: new Date() },
      create: {
        pairKey,
        listingId: arduino.id,
        lastMessagePreview: lastMessage,
        lastMessageAt: new Date(),
        participants: {
          create: [
            { userId: alex, unreadCount: 0 },
            { userId: priya, unreadCount: 1 },
          ],
        },
      },
      select: { id: true },
    });

    const existing = await prisma.message.count({
      where: { conversationId: conversation.id },
    });
    if (existing === 0) {
      await prisma.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            senderId: alex,
            body: "Hi! Is the Arduino kit still available?",
            readAt: new Date(),
          },
          {
            conversationId: conversation.id,
            senderId: priya,
            body: "It is — everything's in the box, board tested this morning.",
            readAt: new Date(),
          },
          { conversationId: conversation.id, senderId: alex, body: lastMessage, readAt: null },
        ],
      });
    }
    process.stdout.write("Seeded saved items and one conversation\n");
  }

  process.stdout.write(`\nDemo accounts — password: ${PASSWORD}\n`);
  for (const student of STUDENTS) process.stdout.write(`  ${student.email}\n`);

  await prisma.$disconnect();
}

seed().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
