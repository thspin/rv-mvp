import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { loadEnv } from "@/lib/env";

loadEnv();

const authSecret = (process.env.BETTER_AUTH_SECRET ?? "").trim();
if (!authSecret) {
  throw new Error(
    "[CRITICAL] BETTER_AUTH_SECRET is not set. Authentication will not work correctly. " +
    "Generate one with: openssl rand -base64 32"
  );
}

// Trim DATABASE_URL to remove any trailing \r\n from env vars
const databaseUrl = (process.env.DATABASE_URL ?? "").trim();
if (!databaseUrl) {
  throw new Error("[CRITICAL] DATABASE_URL is not set. Database connections will fail.");
}

const pool = new Pool({
  connectionString: databaseUrl || undefined,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const getBaseURL = (): string => {
  const betterAuthUrl = (process.env.BETTER_AUTH_URL ?? "").trim();
  if (betterAuthUrl) return betterAuthUrl;
  const vercelUrl = (process.env.VERCEL_URL ?? "").trim();
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
};

const baseURL = getBaseURL();

// Build trusted origins for OAuth callback redirects
function getTrustedOrigins(): string[] {
  const origins: string[] = [];
  try {
    origins.push(new URL(baseURL).origin);
  } catch { /* baseURL might be invalid */ }
  const vercelUrl = (process.env.VERCEL_URL ?? "").trim();
  if (vercelUrl) {
    origins.push(`https://${vercelUrl}`);
  }
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000");
    origins.push("http://127.0.0.1:3000");
  }
  // Deduplicate
  return [...new Set(origins)];
}

export const auth = betterAuth({
  database: pool,
  baseURL,
  secret: authSecret,
  trustedOrigins: getTrustedOrigins(),
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
