import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db/prisma";
import { Role } from "@prisma/client";
import { validateEnv } from "@/lib/env-check";

// Run at module load — throws in production if NEXTAUTH_SECRET is missing.
validateEnv();

const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error(
    "NEXTAUTH_SECRET environment variable is not set. " +
      "Generate one with: openssl rand -base64 32",
  );
}

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
const appleClientId = process.env.APPLE_CLIENT_ID ?? "";
const appleClientSecret = process.env.APPLE_CLIENT_SECRET ?? "";

const oauthProviders = [
  ...(googleClientId && googleClientSecret
    ? [
        GoogleProvider({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        }),
      ]
    : []),
  ...(appleClientId && appleClientSecret
    ? [
        AppleProvider({
          clientId: appleClientId,
          clientSecret: appleClientSecret,
        }),
      ]
    : []),
];

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret ?? "__unset__",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "apple") {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          // Create new user
          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || user.email!.split("@")[0],
              role: "VOLUNTEER", // Default role for OAuth signups
              isActive: true,
              passwordHash: "", // No password for OAuth
            },
          });

          // Update the user object with our data
          user.id = newUser.id;
          user.role = newUser.role;
          user.activeCampaignId = newUser.activeCampaignId;
        } else {
          // Update last login
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { lastLoginAt: new Date() },
          });

          user.id = existingUser.id;
          user.role = existingUser.role;
          user.activeCampaignId = existingUser.activeCampaignId;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.email = user.email;
        token.name = user.name;
        token.activeCampaignId = (user as { activeCampaignId?: string | null }).activeCampaignId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const user = session.user as typeof session.user & { activeCampaignId?: string | null };
        user.id = token.id as string;
        user.role = token.role as Role;
        user.activeCampaignId = (token.activeCampaignId as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            passwordHash: true,
            activeCampaignId: true,
            failedLoginAttempts: true,
            lockedUntil: true,
          },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated");
        }

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          throw new Error(`Account locked. Try again in ${minutesRemaining} minute(s).`);
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) {
          const failedAttempts = user.failedLoginAttempts + 1;
          let lockMs = 0;
          if (failedAttempts >= 10) lockMs = 60 * 60 * 1000;
          else if (failedAttempts >= 5) lockMs = 15 * 60 * 1000;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: failedAttempts,
              lockedUntil: lockMs > 0 ? new Date(Date.now() + lockMs) : null,
            },
          });

          throw new Error("Invalid email or password");
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          activeCampaignId: user.activeCampaignId ?? null,
        };
      },
    }),
    ...oauthProviders,
  ],
};
