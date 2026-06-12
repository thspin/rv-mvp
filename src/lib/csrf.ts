import { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "__Host-csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_FIELD_NAME = "_csrf";
const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function safeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export async function getOrIssueCsrfToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CSRF_COOKIE_NAME)?.value;
  if (existing) return existing;

  const token = generateToken();
  jar.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CSRF_COOKIE_MAX_AGE,
  });
  return token;
}

export function getCsrfCookieName(): string {
  return CSRF_COOKIE_NAME;
}

export function getCsrfFieldName(): string {
  return CSRF_FIELD_NAME;
}

export async function assertCsrfToken(provided: string | undefined | null): Promise<void> {
  if (!provided) {
    throw new Error("CSRF token missing");
  }
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) {
    throw new Error("CSRF cookie missing");
  }
  if (!safeEqual(provided, cookieToken)) {
    throw new Error("CSRF token mismatch");
  }
}

export function assertCsrfFromRequest(request: NextRequest): NextResponse | null {
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!headerToken || !cookieToken) {
    return NextResponse.json({ error: "CSRF token missing" }, { status: 403 });
  }
  if (!safeEqual(headerToken, cookieToken)) {
    return NextResponse.json({ error: "CSRF token mismatch" }, { status: 403 });
  }
  return null;
}
