import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { rateLimitMiddleware } from "@/lib/rate-limit";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) origins.add(appUrl.replace(/\/$/, ""));
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) origins.add(`https://${vercelUrl}`);
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return origins;
}

function getRequestOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin.replace(/\/$/, "");
    } catch {
      return null;
    }
  }
  return null;
}

function isSameOrigin(request: NextRequest): boolean {
  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) return false;
  return getAllowedOrigins().has(requestOrigin);
}

function isServerActionRequest(request: NextRequest): boolean {
  return request.headers.get("next-action") !== null;
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isCronRoute(pathname: string): boolean {
  return pathname === "/api/cron";
}

function isUploadRoute(pathname: string): boolean {
  return pathname.startsWith("/api/storage/upload");
}

function isCsrfExemptApiRoute(pathname: string): boolean {
  return (
    isCronRoute(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/storage")
  );
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/debug")) {
    if (process.env.ENABLE_DEBUG_ENDPOINT !== "true") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/auth")) {
    const rlResponse = await rateLimitMiddleware(request, 20, "1 m");
    if (rlResponse) return rlResponse;
    return NextResponse.next();
  }

  if (isUploadRoute(pathname)) {
    const rlResponse = await rateLimitMiddleware(request, 5, "1 m");
    if (rlResponse) return rlResponse;
  } else if (pathname.startsWith("/api/storage")) {
    const rlResponse = await rateLimitMiddleware(request, 30, "1 m");
    if (rlResponse) return rlResponse;
  } else if (pathname.startsWith("/api/")) {
    const rlResponse = await rateLimitMiddleware(request, 60, "1 m");
    if (rlResponse) return rlResponse;
  }

  if (
    UNSAFE_METHODS.has(request.method) &&
    (isApiRoute(pathname) || isServerActionRequest(request))
  ) {
    if (isApiRoute(pathname) && isCsrfExemptApiRoute(pathname)) {
      return NextResponse.next();
    }
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!isApiRoute(pathname)) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!$|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
