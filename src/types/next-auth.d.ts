import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      activeCampaignId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    activeCampaignId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    activeCampaignId: string | null;
  }
}
