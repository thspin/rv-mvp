import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

// Content Security Policy. Stricter in production; a little looser in
// dev so Next.js' dev server (HMR, eval, inline styles) keeps working.
//
// Notes:
// - 'unsafe-inline' is allowed for both script-src and style-src
//   because Next.js' streaming SSR + shadcn/ui's CSS-in-JS emit inline
//   styles. A future hardening pass should switch to nonce-based CSP
//   and drop 'unsafe-inline' (would require App Router Middleware
//   generating a per-request nonce and threading it through).
// - connect-src includes *.supabase.co and *.sentry.io for direct
//   browser→service calls. Sentry's browser SDK opens a long-lived
//   fetch to /api/0/envelope/ or its ingest endpoint, depending on
//   tunnelRoute config.
// - wss://*.supabase.co is included so the realtime client (if
//   enabled later) can subscribe over websockets.
// - frame-ancestors 'none' replaces the X-Frame-Options header for
//   modern browsers; we keep the X-Frame-Options header for legacy
//   clients.
const csp = [
  "default-src 'self'",
  isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  isProd ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Content-Security-Policy", value: csp },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  tunnelRoute: "/monitoring",
  automaticVercelMonitors: true,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { disable: true },
});
