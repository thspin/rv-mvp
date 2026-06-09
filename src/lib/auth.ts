import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const getBaseURL = () => {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL.trim();
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.trim()}`;
  return "http://localhost:3000";
};

export const auth = betterAuth({
  database: pool,
  baseURL: getBaseURL(),
  secret: (process.env.BETTER_AUTH_SECRET ?? "").trim(),
  socialProviders: {
    google: {
      clientId: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
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
