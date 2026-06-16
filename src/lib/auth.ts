import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EmailNotVerified";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        // Credentials must have a verified email before they can sign in.
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      const email = user.email;
      if (!email) return false;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        user.id = existing.id;
        // Google has already verified this address; mark it verified if it
        // wasn't (e.g. the user first signed up with email/password).
        if (!existing.emailVerified) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { emailVerified: new Date() },
          });
        }
      } else {
        const created = await prisma.user.create({
          data: { email, name: user.name ?? null, passwordHash: null, emailVerified: new Date() } as unknown as Parameters<typeof prisma.user.create>[0]["data"],
        });
        user.id = created.id;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
