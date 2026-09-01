import "server-only";
import type { User as UserRow } from "@prisma/client";
import { toEmail, toEntityId, type Email, type EntityId } from "@/core/types/branded";
import { prisma } from "@/shared/db/connection";
import type { CreateUserInput, UpdateProfileInput, UserRepository } from "../domain/ports";
import { isRole, type User } from "../domain/user";

/**
 * Never select `passwordHash` by default. Only `findCredentialsByEmail` asks for it, so a
 * stray lookup cannot leak a hash into a server component's props.
 */
const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  bio: true,
  campusArea: true,
  ratingSum: true,
  ratingCount: true,
  createdAt: true,
} as const;

type PublicUser = Pick<UserRow, keyof typeof PUBLIC_FIELDS>;

export class PrismaUserRepository implements UserRepository {
  async findById(id: EntityId): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { email }, select: PUBLIC_FIELDS });
    return row ? toDomain(row) : null;
  }

  async findCredentialsByEmail(
    email: Email,
  ): Promise<{ user: User; passwordHash: string } | null> {
    const row = await prisma.user.findUnique({
      where: { email },
      select: { ...PUBLIC_FIELDS, passwordHash: true },
    });
    if (!row) return null;
    const { passwordHash, ...user } = row;
    return { user: toDomain(user), passwordHash };
  }

  async findCredentialsById(
    id: EntityId,
  ): Promise<{ user: User; passwordHash: string } | null> {
    const row = await prisma.user.findUnique({
      where: { id },
      select: { ...PUBLIC_FIELDS, passwordHash: true },
    });
    if (!row) return null;
    const { passwordHash, ...user } = row;
    return { user: toDomain(user), passwordHash };
  }

  async emailExists(email: Email): Promise<boolean> {
    const found = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return found !== null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const row = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role ?? "student",
      },
      select: PUBLIC_FIELDS,
    });
    return toDomain(row);
  }

  async updateProfile(id: EntityId, input: UpdateProfileInput): Promise<User | null> {
    try {
      const row = await prisma.user.update({
        where: { id },
        data: { name: input.name, bio: input.bio, campusArea: input.campusArea },
        select: PUBLIC_FIELDS,
      });
      return toDomain(row);
    } catch {
      // P2025 — the row disappeared between the guard and the write. The caller's contract
      // is "null means gone", not an exception.
      return null;
    }
  }

  async updatePasswordHash(id: EntityId, passwordHash: string): Promise<boolean> {
    try {
      await prisma.user.update({ where: { id }, data: { passwordHash }, select: { id: true } });
      return true;
    } catch {
      // P2025 — the account was deleted between the guard and the write.
      return false;
    }
  }

  async delete(id: EntityId): Promise<boolean> {
    try {
      // Listings, saved items, conversation participation, messages, reviews and reports
      // all cascade from this row, so there is nothing to clean up by hand.
      await prisma.user.delete({ where: { id }, select: { id: true } });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Database row to domain entity. Repositories return entities, never Prisma rows, so the
 * layers above never depend on the persistence shape.
 */
function toDomain(row: PublicUser): User {
  return {
    id: toEntityId(row.id),
    name: row.name,
    email: toEmail(row.email),
    role: isRole(row.role) ? row.role : "student",
    bio: row.bio,
    campusArea: row.campusArea,
    ratingSum: row.ratingSum,
    ratingCount: row.ratingCount,
    createdAt: row.createdAt,
  };
}
