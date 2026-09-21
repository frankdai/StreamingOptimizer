import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  verifyMagicLinkToken,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  const baseUrl = new URL("/", request.url);

  if (!token) {
    baseUrl.searchParams.set("auth_error", "missing_token");
    return NextResponse.redirect(baseUrl);
  }

  try {
    // 1. Decode email to find user record
    const [payloadEncoded] = token.split(".");
    if (!payloadEncoded) {
      baseUrl.searchParams.set("auth_error", "invalid_token");
      return NextResponse.redirect(baseUrl);
    }

    let payload: { email: string; exp: number };
    try {
      let b64 = payloadEncoded.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      payload = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
    } catch {
      baseUrl.searchParams.set("auth_error", "invalid_token_format");
      return NextResponse.redirect(baseUrl);
    }

    const user = (await db.select().from(users).where(eq(users.email, payload.email)))[0];
    if (!user) {
      baseUrl.searchParams.set("auth_error", "user_not_found");
      return NextResponse.redirect(baseUrl);
    }

    // 2. Verify token signature against user's lastLoginAt
    const verification = verifyMagicLinkToken(token, user.lastLoginAt);
    if (!verification.valid || !verification.email) {
      baseUrl.searchParams.set(
        "auth_error",
        verification.error || "Token expired or already used"
      );
      return NextResponse.redirect(baseUrl);
    }

    // 3. Mark user as logged in (instant revocation of this magic link!)
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // 4. Create 30-day session token
    const sessionToken = createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // 5. Issue Set-Cookie and redirect
    baseUrl.searchParams.set("auth_success", "true");
    const response = NextResponse.redirect(baseUrl);

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error("Magic link verification error:", err);
    baseUrl.searchParams.set("auth_error", "server_error");
    return NextResponse.redirect(baseUrl);
  }
}
