import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { rateLimitMiddleware } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/debug')) {
    if (process.env.ENABLE_DEBUG_ENDPOINT !== 'true') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/auth')) {
    const rlResponse = await rateLimitMiddleware(request, 20, '1 m');
    if (rlResponse) return rlResponse;
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/storage/upload')) {
    const rlResponse = await rateLimitMiddleware(request, 5, '1 m');
    if (rlResponse) return rlResponse;
  } else if (pathname.startsWith('/api/storage')) {
    const rlResponse = await rateLimitMiddleware(request, 30, '1 m');
    if (rlResponse) return rlResponse;
  } else if (pathname.startsWith('/api/')) {
    const rlResponse = await rateLimitMiddleware(request, 60, '1 m');
    if (rlResponse) return rlResponse;
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!$|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
