import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { BUNDLE_COOKIE, UNLOCK_COOKIE, parseSlugs, serializeSlugs } from "@/lib/unlock";
import { TRUSTSTAY_USER_EMAIL_COOKIE } from "@/lib/kv";
import {
  consumeUnlockRestoreToken,
  getRestorableUnlocksByEmail,
} from "@/lib/unlockEntitlements";

function safeNextPath(input: string | null): string {
  if (!input) return "/";
  if (!input.startsWith("/") || input.startsWith("//")) return "/";
  return input;
}

function redirectWithStatus(request: NextRequest, nextPath: string, status: string) {
  const url = new URL(nextPath, request.nextUrl.origin);
  url.searchParams.set("restore", status);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const nextPath = safeNextPath(req.nextUrl.searchParams.get("next"));

  if (!token) {
    return redirectWithStatus(req, nextPath, "invalid");
  }

  const emailNormalized = await consumeUnlockRestoreToken(token);
  if (!emailNormalized) {
    return redirectWithStatus(req, nextPath, "invalid");
  }

  const unlocks = await getRestorableUnlocksByEmail(emailNormalized);
  if (unlocks.unlockedCitySlugs.length === 0 && unlocks.bundleCitySlugs.length === 0) {
    return redirectWithStatus(req, nextPath, "empty");
  }

  const responseUrl = new URL(nextPath, req.nextUrl.origin);
  responseUrl.searchParams.set("restored", "1");
  responseUrl.searchParams.set(
    "restoredCount",
    String(unlocks.unlockedCitySlugs.length + unlocks.bundleCitySlugs.length),
  );
  const response = NextResponse.redirect(responseUrl);

  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.app.isProduction,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  };

  const existingUnlocks = parseSlugs(req.cookies.get(UNLOCK_COOKIE)?.value ?? "");
  const existingBundles = parseSlugs(req.cookies.get(BUNDLE_COOKIE)?.value ?? "");
  const mergedUnlocks = [...new Set([...existingUnlocks, ...unlocks.unlockedCitySlugs])];
  const mergedBundles = [...new Set([...existingBundles, ...unlocks.bundleCitySlugs])];

  if (mergedUnlocks.length > 0) {
    response.cookies.set(UNLOCK_COOKIE, serializeSlugs(mergedUnlocks), cookieOpts);
  }
  if (mergedBundles.length > 0) {
    response.cookies.set(BUNDLE_COOKIE, serializeSlugs(mergedBundles), cookieOpts);
  }
  response.cookies.set(TRUSTSTAY_USER_EMAIL_COOKIE, emailNormalized, cookieOpts);

  return response;
}
