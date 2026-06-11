import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "./db";
import { verifyCredentials, ensureHandle } from "./users";
import { resolveAuthSecret } from "./authSecret";
import { rateLimit } from "./rateLimit";

export const authOptions: NextAuthOptions = {
  secret: resolveAuthSecret(process.env),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const db = await getDb();
        // Throttle password attempts per target account: 10 per 10 minutes
        // (slows brute-forcing a specific email; fails open on limiter error).
        const rl = await rateLimit(db, `login:${credentials.email.toLowerCase()}`, 10, 10 * 60_000);
        if (!rl.ok) return null;
        const user = await verifyCredentials(db, credentials.email, credentials.password);
        // Lazily backfill a @handle for pre-existing accounts that never got one,
        // so their profile and @mentions work after this login. Best-effort.
        if (user) {
          try {
            await ensureHandle(db, user.email);
          } catch {
            /* non-fatal — never block login on handle assignment */
          }
        }
        return user ? { id: user.id, email: user.email, name: user.name, image: user.image } : null;
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const db = await getDb();
        await db.collection("users").updateOne(
          { email: user.email },
          { $setOnInsert: { email: user.email, createdAt: new Date() }, $set: { name: user.name, image: user.image ?? null } },
          { upsert: true },
        );
        // Ensure the (possibly just-created) Google user has a stable @handle.
        try {
          await ensureHandle(db, user.email);
        } catch {
          /* non-fatal */
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.name = user.name;
        token.picture = user.image ?? null;
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.image !== undefined) token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = (token.name as string) ?? null;
        session.user.image = (token.picture as string | null) ?? null;
      }
      return session;
    },
  },
};
