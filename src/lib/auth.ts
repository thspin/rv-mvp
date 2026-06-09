import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

const trim = (v: string | undefined, fallback: string) => (v || fallback).trim();

const pool = new Pool({
  connectionString: trim(process.env.DATABASE_URL, ""),
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export const auth = betterAuth({
  database: pool,
  baseURL: trim(process.env.BETTER_AUTH_URL, "https://rv-mvp.vercel.app"),
  secret: trim(process.env.BETTER_AUTH_SECRET, ""),
  socialProviders: {
    google: {
      clientId: trim(process.env.GOOGLE_CLIENT_ID, ""),
      clientSecret: trim(process.env.GOOGLE_CLIENT_SECRET, ""),
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "atleta",
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});
