import type { Email, EntityId } from "@/core/types/branded";
import type { Role, User } from "./user";

export interface CreateUserInput {
  readonly name: string;
  readonly email: Email;
  readonly passwordHash: string;
  readonly role?: Role;
}

export interface UpdateProfileInput {
  readonly name: string;
  readonly bio: string | null;
  readonly campusArea: string | null;
}

export interface UserRepository {
  findById(id: EntityId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  /** Returns the hash separately — it is `select: false` and never rides on `User`. */
  findCredentialsByEmail(email: Email): Promise<{ user: User; passwordHash: string } | null>;
  /**
   * The same, keyed by id — for a signed-in student re-proving who they are before
   * changing their password or deleting their account.
   */
  findCredentialsById(id: EntityId): Promise<{ user: User; passwordHash: string } | null>;
  emailExists(email: Email): Promise<boolean>;
  create(input: CreateUserInput): Promise<User>;
  updateProfile(id: EntityId, input: UpdateProfileInput): Promise<User | null>;
  /** Returns false when the account is already gone. */
  updatePasswordHash(id: EntityId, passwordHash: string): Promise<boolean>;
  /** Listings, saved items, threads and reports cascade with it. */
  delete(id: EntityId): Promise<boolean>;
}

/**
 * Hashing lives behind a port so the domain never imports bcrypt, and so tests can swap
 * in a fast fake instead of paying the cost of a real KDF on every case.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
