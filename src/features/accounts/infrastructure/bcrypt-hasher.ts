import "server-only";
import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../domain/ports";

/** 12 rounds: comfortably above the 2025 baseline, still well under 250ms on a laptop. */
const COST = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, COST);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
