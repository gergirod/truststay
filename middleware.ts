import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const TRUSTSTAY_USER_COOKIE = "ts_uid";

export function middleware(request: NextRequest) {
  const existingUserId = request.cookies.get(TRUSTSTAY_USER_COOKIE)?.value;
  if (existingUserId) return NextResponse.next();

  const response = NextResponse.next();
  response.cookies.set(TRUSTSTAY_USER_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return response;
}

export const config = {
  matcher: ["/city/:path*"],
};
