import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "./db";
import { verifyCredentials } from "./users";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const db = await getDb();
        const user = await verifyCredentials(db, credentials.email, credentials.password);
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
