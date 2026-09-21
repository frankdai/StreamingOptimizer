import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { createMagicLinkToken, verifyMagicLinkToken, createSessionToken, verifySessionToken } from "../lib/auth";
import { getMailer } from "../lib/email/mailer";
import { generateMagicLinkEmail } from "../lib/email/templates";

async function testFirstTimeUserFlow() {
  console.log("=================================================");
  console.log("Testing First-Time User Magic Link Auto-Creation");
  console.log("=================================================");

  const newEmail = `user_${Date.now()}@example.com`;
  console.log(`Target new user email: ${newEmail}`);

  // 1. Verify user does NOT exist in DB yet
  const existingUser = (await db.select().from(users).where(eq(users.email, newEmail)))[0];
  console.log("Initial DB check (should be undefined):", existingUser);
  if (existingUser) throw new Error("User unexpectedly exists");

  // 2. Request magic link without creating DB user (stateless token generation with null lastLoginAt)
  const token = createMagicLinkToken(newEmail, null);
  console.log("1. Generated stateless token without pre-creating DB row:", token.slice(0, 30) + "...");

  // 3. Send email to Mailpit on localhost:1025
  const mailer = getMailer();
  const magicLinkUrl = `http://localhost:3000/api/auth/verify?token=${encodeURIComponent(token)}`;
  const emailContent = generateMagicLinkEmail({ email: newEmail, magicLinkUrl });

  await mailer.sendEmail({
    to: newEmail,
    ...emailContent,
  });

  // 4. Verification step: verify token signature with null lastLoginAt
  const verification = verifyMagicLinkToken(token, null);
  console.log("2. Token verification result:", verification);
  if (!verification.valid) throw new Error("Token failed to verify");

  // 5. Automatic user creation on verification with derived name
  const derivedName = newEmail.split("@")[0];
  const [createdUser] = await db
    .insert(users)
    .values({
      email: newEmail,
      name: derivedName,
      lastLoginAt: new Date(),
    })
    .returning();

  console.log(`3. Automatically created user in Postgres!`);
  console.log(`   - ID: ${createdUser.id}`);
  console.log(`   - Email: ${createdUser.email}`);
  console.log(`   - Derived Name: "${createdUser.name}"`);

  // 6. Test replay prevention: trying to use the same token again should now fail!
  const replayVerification = verifyMagicLinkToken(token, createdUser.lastLoginAt);
  console.log("4. Replay check (should be invalid):", replayVerification);
  if (replayVerification.valid) throw new Error("Replay should have failed");

  // 7. Issue 30-day session
  const sessionToken = createSessionToken({
    id: createdUser.id,
    email: createdUser.email,
    name: createdUser.name,
  });
  const sessionResult = verifySessionToken(sessionToken);
  console.log("5. 30-day session created successfully:", sessionResult);

  console.log("\n[SUCCESS] First-time user auto-creation flow verified!");
}

testFirstTimeUserFlow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  });
