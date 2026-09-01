/**
 * Branded primitives. A `Slug` is not interchangeable with an `Email` even though both
 * are strings at runtime — the brand makes the compiler enforce what the name implies.
 */
declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type Slug = Brand<string, "Slug">;
export type Email = Brand<string, "Email">;
export type EntityId = Brand<string, "EntityId">;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Prisma `@default(cuid())`: a lowercase alphanumeric string starting with "c".
// Deliberately permissive on length — cuid1 and cuid2 differ, and this only needs to
// reject obviously-not-an-id input before it reaches the database.
const ENTITY_ID_PATTERN = /^[a-z0-9]{8,32}$/i;

export function isSlug(value: string): value is Slug {
  return SLUG_PATTERN.test(value);
}

export function isEmail(value: string): value is Email {
  return EMAIL_PATTERN.test(value);
}

export function isEntityId(value: string): value is EntityId {
  return ENTITY_ID_PATTERN.test(value);
}

/** Normalises to lowercase and trims before branding. */
export function toEmail(value: string): Email {
  return value.trim().toLowerCase() as Email;
}

export function toEntityId(value: string): EntityId {
  return value as EntityId;
}

/**
 * Slugify a listing title. Idempotent.
 *
 * Two students can both list "Engineering Mathematics 3", so callers append a short
 * suffix to guarantee uniqueness rather than relying on the title alone.
 */
export function toSlug(value: string): Slug {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) as Slug;
}
