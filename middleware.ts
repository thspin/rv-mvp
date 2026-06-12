import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/debug')) {
    if (process.env.ENABLE_DEBUG_ENDPOINT !== 'true') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!$|auth|_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
