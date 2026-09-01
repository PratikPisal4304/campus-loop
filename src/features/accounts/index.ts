import "server-only";
import type { EntityId } from "@/core/types/branded";
import * as profile from "./application/profile";
import * as accounts from "./application/register";
import * as security from "./application/security";
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

export const changePassword = (id: EntityId, input: security.ChangePasswordInput) =>
  security.changePassword(deps, id, input);

export const deleteAccount = (id: EntityId, password: string) =>
  security.deleteAccount(deps, id, password);

export { handlers, signIn, signOut, auth } from "./infrastructure/auth";
export {
  getSessionUser,
  requireRole,
  requireRoleOrNotFound,
  requireUser,
  requireUserOrRedirect,
  type SessionUser,
} from "./infrastructure/guards";
export { initialsFor, trustScoreFor, type Role, type TrustScore } from "./domain/user";
export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validatePassword } from "./domain/password";
export type { ChangePasswordInput } from "./application/security";
export { toProfileView, type ProfileView } from "./application/profile";
