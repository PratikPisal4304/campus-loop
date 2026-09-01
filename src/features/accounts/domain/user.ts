import type { Email, EntityId } from "@/core/types/branded";

export const ROLES = ["student", "admin"] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  readonly id: EntityId;
  readonly name: string;
  readonly email: Email;
  readonly role: Role;
  readonly bio: string | null;
  readonly campusArea: string | null;
  readonly ratingSum: number;
  readonly ratingCount: number;
  readonly createdAt: Date;
}

/**
 * Initials for the avatar circle — "Alex Rivera" becomes "AR".
 *
 * Ported from the prototype's `displayUser()`, which did the same thing but crashed on an
 * empty name and produced junk for names with double spaces.
 */
export function initialsFor(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

export interface TrustScore {
  /** Null until the student has enough ratings for an average to mean anything. */
  readonly rating: number | null;
  readonly ratingCount: number;
  readonly label: string;
}

/**
 * Trust is deliberately conservative: a single 5-star rating from one friend should not
 * outrank a seller with twenty good handoffs, so a lone rating still reads as "New".
 * The prototype hard-coded the string "New" and never computed anything.
 */
export function trustScoreFor(user: Pick<User, "ratingSum" | "ratingCount">): TrustScore {
  if (user.ratingCount < 2) {
    return { rating: null, ratingCount: user.ratingCount, label: "New" };
  }
  const rating = Math.round((user.ratingSum / user.ratingCount) * 10) / 10;
  const label =
    rating >= 4.5 ? "Excellent" : rating >= 4 ? "Trusted" : rating >= 3 ? "Fair" : "Mixed";
  return { rating, ratingCount: user.ratingCount, label };
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
