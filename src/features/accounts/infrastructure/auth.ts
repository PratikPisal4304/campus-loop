import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { env } from "@/shared/env";
import { verifyCredentials } from "../application/register";
import { authConfig } from "./auth.config";
import { BcryptPasswordHasher } from "./bcrypt-hasher";
import { MongoUserRepository } from "./user.repository";

const credentialsSchema = z.object({
  email: z.email().max(120),
  password: z.string().min(1).max(128),
});

const deps = {
  users: new MongoUserRepository(),
  hasher: new BcryptPasswordHasher(),
};

/**
 * The NODE half: adds the secret and the credentials provider, both of which need
 * database and bcrypt access that the edge runtime cannot provide.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        // Returning null rather than throwing: Auth.js turns a thrown error into a
        // distinguishable response, which would tell an attacker which half was wrong.
        if (!parsed.success) return null;

        const result = await verifyCredentials(deps, parsed.data);
        if (!result.ok) return null;

        const user = result.value;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        token.role = user.role ?? "student";
      }
      return token;
    },
  },
});
