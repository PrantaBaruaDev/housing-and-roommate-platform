import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  PrismaClient,
  Role,
  UserStatus,
  PropertyType,
  BookingMode,
} from "../../src/generated/prisma/client";

const prisma = new PrismaClient();

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

/* ────────────────────────────────────────────────────────────────
   Seed identities — sourced from env with sane fallbacks so the
   script runs even if .env is incomplete in local dev.
   ──────────────────────────────────────────────────────────────── */

const ADMIN = {
  name: process.env.TESTER_ADMIN_NAME || "Tester Admin 1",
  email: process.env.TESTER_ADMIN_EMAIL || "testeradmin@gmail.com",
  password: process.env.TESTER_ADMIN_PASSWORD || "Admin@1234",
  phone: "+8801700000001",
  address: "Banani, Dhaka",
};

const OWNERS = [
  {
    name: process.env.TESTER_OWNER_NAME || "Tester Owner 1",
    email: process.env.TESTER_OWNER_EMAIL || "testerowner@gmail.com",
    password: process.env.TESTER_OWNER_PASSWORD || "Owner@1234",
    phone: "+8801711111111",
    address: "Khulna, Bangladesh",
  },
  {
    name: "Tester Owner 2",
    email: "testerowner2@gmail.com",
    password: "Owner@1234",
    phone: "+8801722222222",
    address: "Sylhet, Bangladesh",
  },
];

const TENANTS = [
  {
    name: process.env.TESTER_TENANT_NAME || "Tester Tenant 1",
    email: process.env.TESTER_TENANT_EMAIL || "testertenant@gmail.com",
    password: process.env.TESTER_TENANT_PASSWORD || "Tenant@1234",
    phone: "+8801733333333",
    address: "Dhanmondi, Dhaka",
  },
  {
    name: "Tester Tenant 2",
    email: "testertenant2@gmail.com",
    password: "Tenant@1234",
    phone: "+8801744444444",
    address: "Zindabazar, Sylhet",
  },
];

const ALL_SEED_EMAILS = [
  ADMIN.email,
  ...OWNERS.map((o) => o.email),
  ...TENANTS.map((t) => t.email),
];

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */

async function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function upsertUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone: string;
  address: string;
}) {
  const hashed = await hashPassword(input.password);

  return prisma.users.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashed,
      role: input.role,
      status: UserStatus.ACTIVE,
      profiles: {
        create: {
          phone: input.phone,
          address: input.address,
        },
      },
    },
    include: { profiles: true },
  });
}

/* ────────────────────────────────────────────────────────────────
   Property seed data — one array, one loop, easy to extend.
   Owner indexes refer to positions in the OWNERS array.
   ──────────────────────────────────────────────────────────────── */

interface SeedRoom {
  roomNumber: string;
  rentAmount: number;
  bookingMode?: BookingMode;
  maxCapacity?: number;
}

interface SeedFlat {
  flatName: string;
  floorNumber: number;
  rooms: SeedRoom[];
}

interface SeedProperty {
  ownerIndex: number;
  title: string;
  description: string;
  address: string;
  city: string;
  propertyType: PropertyType;
  amenities: string[];
  isVerified?: boolean;
  flats: SeedFlat[];
}

const SEED_PROPERTIES: SeedProperty[] = [
  {
    ownerIndex: 0,
    title: "Riverside 2BR Flat in Khulna Sadar",
    description:
      "Comfortable 2-bedroom residential flat with modern fittings, south-facing balcony for natural light, and easy access to public transport and markets.",
    address: "72 KDA Avenue, Mojgunni",
    city: "Khulna",
    propertyType: PropertyType.RESIDENTIAL,
    amenities: ["Balcony", "Furnished", "South-facing"],
    isVerified: true,
    flats: [
      {
        flatName: "Flat A",
        floorNumber: 1,
        rooms: [
          { roomNumber: "A-101", rentAmount: 8500, maxCapacity: 2 },
          { roomNumber: "A-102", rentAmount: 9500, maxCapacity: 2 },
        ],
      },
      {
        flatName: "Flat B",
        floorNumber: 2,
        rooms: [
          {
            roomNumber: "B-201",
            rentAmount: 7000,
            bookingMode: BookingMode.BOOK_BY_SEAT,
            maxCapacity: 3,
          },
          { roomNumber: "B-202", rentAmount: 12000, maxCapacity: 2 },
        ],
      },
    ],
  },
  {
    ownerIndex: 0,
    title: "Cozy Duplex Family Home near Zindabazar",
    description:
      "Charming 4-bedroom duplex house with a private garden, rooftop terrace, and wide garage space. Situated in a peaceful residential neighborhood.",
    address: "Lane 3, Nayasarak Road, Zindabazar",
    city: "Sylhet",
    propertyType: PropertyType.RESIDENTIAL,
    amenities: ["Private garden", "Rooftop terrace", "Garage"],
    flats: [
      {
        flatName: "Ground Floor",
        floorNumber: 0,
        rooms: [
          { roomNumber: "G-01", rentAmount: 14000, maxCapacity: 2 },
          { roomNumber: "G-02", rentAmount: 15000, maxCapacity: 2 },
        ],
      },
      {
        flatName: "Upper Floor",
        floorNumber: 1,
        rooms: [
          { roomNumber: "U-11", rentAmount: 16000, maxCapacity: 2 },
          { roomNumber: "U-12", rentAmount: 13500, maxCapacity: 2 },
        ],
      },
    ],
  },
  {
    ownerIndex: 0,
    title: "Spacious Commercial Office Space in Agrabad",
    description:
      "Prime commercial office space located in the heart of Chattogram's business hub. Offers open floor plan, central air conditioning, and dedicated basement parking.",
    address: "45 Agrabad Commercial Area",
    city: "Chattogram",
    propertyType: PropertyType.COMMERCIAL,
    amenities: ["Central AC", "Basement parking", "Open floor plan"],
    flats: [
      {
        flatName: "Main Hall",
        floorNumber: 3,
        rooms: [
          {
            roomNumber: "OF-301",
            rentAmount: 45000,
            bookingMode: BookingMode.BOOK_BY_ROOM,
            maxCapacity: 10,
          },
          {
            roomNumber: "OF-302",
            rentAmount: 35000,
            bookingMode: BookingMode.BOOK_BY_ROOM,
            maxCapacity: 6,
          },
        ],
      },
    ],
  },
  {
    ownerIndex: 1,
    title: "Modern Studio Apartments in Dhanmondi",
    description:
      "Freshly built studio apartments ideal for students and young professionals. Walking distance to Dhanmondi Lake, universities, and cafés.",
    address: "House 12, Road 8, Dhanmondi",
    city: "Dhaka",
    propertyType: PropertyType.RESIDENTIAL,
    amenities: ["Furnished", "Wi-Fi ready", "Security"],
    flats: [
      {
        flatName: "Studio Block A",
        floorNumber: 4,
        rooms: [
          {
            roomNumber: "S-401",
            rentAmount: 11000,
            bookingMode: BookingMode.BOOK_BY_ROOM,
            maxCapacity: 1,
          },
          {
            roomNumber: "S-402",
            rentAmount: 11000,
            bookingMode: BookingMode.BOOK_BY_ROOM,
            maxCapacity: 1,
          },
        ],
      },
      {
        flatName: "Studio Block B",
        floorNumber: 5,
        rooms: [
          {
            roomNumber: "S-501",
            rentAmount: 12500,
            bookingMode: BookingMode.BOOK_BY_ROOM,
            maxCapacity: 1,
          },
        ],
      },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────
   Main
   ──────────────────────────────────────────────────────────────── */

async function main() {
  console.log("→ Cleaning previous seed data…");

  // Cascade on users cleans up profiles → properties → flats → rooms.
  await prisma.users.deleteMany({
    where: { email: { in: ALL_SEED_EMAILS } },
  });

  console.log("→ Creating users…");

  const admin = await upsertUser({ ...ADMIN, role: Role.ADMIN });
  const owners = await Promise.all(
    OWNERS.map((o) => upsertUser({ ...o, role: Role.OWNER })),
  );
  const tenants = await Promise.all(
    TENANTS.map((t) => upsertUser({ ...t, role: Role.TENANT })),
  );

  console.log(
    `   admin=${admin.email}  owners=${owners.length}  tenants=${tenants.length}`,
  );

  console.log("→ Creating properties, flats, and rooms…");

  for (const spec of SEED_PROPERTIES) {
    const owner = owners[spec.ownerIndex]!;

    const property = await prisma.property.create({
      data: {
        title: spec.title,
        description: spec.description,
        address: spec.address,
        city: spec.city,
        ownerId: owner.id,
        propertyType: spec.propertyType,
        amenities: spec.amenities,
        isVerified: spec.isVerified ?? false,
        verifiedAt: spec.isVerified ? new Date() : null,
        verifiedBy: spec.isVerified ? admin.id : null,
      },
    });

    for (const flatSpec of spec.flats) {
      const flat = await prisma.flats.create({
        data: {
          propertyId: property.id,
          flatName: flatSpec.flatName,
          floorNumber: flatSpec.floorNumber,
          totalRooms: flatSpec.rooms.length,
        },
      });

      const rooms = flatSpec.rooms.map((room) => ({
        propertyId: property.id,
        flatId: flat.id,
        roomNumber: room.roomNumber,
        rentAmount: room.rentAmount,
        bookingMode: room.bookingMode ?? BookingMode.BOOK_BY_ROOM,
        maxCapacity: room.maxCapacity ?? 1,
        availableCapacity: room.maxCapacity ?? 1,
        isAvailable: true,
      }));

      await prisma.rooms.createMany({ data: rooms });
    }

    console.log(
      `   ✓ ${property.title} (${spec.flats.length} flats, ${spec.flats.reduce(
        (n, f) => n + f.rooms.length,
        0,
      )} rooms)`,
    );
  }

  console.log("\n✅ Seed complete.\n");
  console.log("Login credentials:");
  console.log(`  ADMIN   ${ADMIN.email}    / ${ADMIN.password}`);
  OWNERS.forEach((o) => console.log(`  OWNER   ${o.email}    / ${o.password}`));
  TENANTS.forEach((t) => console.log(`  TENANT  ${t.email}    / ${t.password}`));
}

main()
  .catch((err) => {
    console.error("\n❌ Seed failed:\n", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });