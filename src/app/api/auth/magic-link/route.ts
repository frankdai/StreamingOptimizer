import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createMagicLinkToken } from "@/lib/auth";
import { getMailer } from "@/lib/email/mailer";
import { generateMagicLinkEmail } from "@/lib/email/templates";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email ? String(body.email).toLowerCase().trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
    }

    // 1. Find or create user in Postgres
    let user = (await db.select().from(users).where(eq(users.email, email)))[0];
    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name: email.split("@")[0],
        })
        .returning();
      user = newUser;
    }

    // 2. Generate stateless magic token (salted with lastLoginAt for replay prevention)
    const token = createMagicLinkToken(user.email, user.lastLoginAt);

    // 3. Construct Magic Link URL
    const origin =
      request.headers.get("origin") ||
      request.headers.get("x-forwarded-host") ||
      "http://localhost:3000";
    const hostWithProtocol = origin.startsWith("http") ? origin : `https://${origin}`;
    const magicLinkUrl = `${hostWithProtocol}/api/auth/verify?token=${encodeURIComponent(token)}`;

    // 4. Send email (Mailpit on port 1025 in dev; Resend in prod)
    const mailer = getMailer();
    const emailContent = generateMagicLinkEmail({
      email: user.email,
      magicLinkUrl,
    });

    await mailer.sendEmail({
      to: user.email,
      ...emailContent,
    });

    return NextResponse.json({
      success: true,
      message: "Magic sign-in link sent! Check your inbox (or Mailpit at localhost:8025).",
    });
  } catch (err: any) {
    console.error("Magic Link Request Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
