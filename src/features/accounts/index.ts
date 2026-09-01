import "server-only";
import type { EntityId } from "@/core/types/branded";
import * as profile from "./application/profile";
import * as accounts from "./application/register";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt-hasher";
import { PrismaUserRepository } from "./infrastructure/user.repository";

/**
 * Public API of the accounts feature.
 *
 * This barrel is also the feature's composition root: it binds the Prisma and bcrypt
 * adapters to the use cases, so callers never see a repository or a hasher. Nothing
 * outside this folder may import a deeper path — enforced by ESLint and `test:arch`.
 */
const deps: accounts.AccountDeps = {
  users: new PrismaUserRepository(),
  hasher: new BcryptPasswordHasher(),
};

export const register = (input: accounts.RegisterInput) => accounts.register(deps, input);

export const getProfile = (id: EntityId) => profile.getProfile(deps, id);

export const updateProfile = (id: EntityId, input: profile.UpdateProfileFormInput) =>
  profile.updateProfile(deps, id, input);

export { handlers, signIn, signOut, auth } from "./infrastructure/auth";
export { getSessionUser, requireUser, type SessionUser } from "./infrastructure/guards";
export { initialsFor, trustScoreFor, type Role, type TrustScore } from "./domain/user";
export { toProfileView, type ProfileView } from "./application/profile";
