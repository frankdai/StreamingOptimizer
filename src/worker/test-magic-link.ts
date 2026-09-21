import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { createMagicLinkToken, verifyMagicLinkToken, createSessionToken, verifySessionToken } from "../lib/auth";
import { getMailer } from "../lib/email/mailer";
import { generateMagicLinkEmail } from "../lib/email/templates";

async function testFullMagicLinkFlow() {
  console.log("Testing end-to-end Magic Link Flow...");

  const email = "frank@example.com";

  // 1. Get or create user
  let user = (await db.select().from(users).where(eq(users.email, email)))[0];
  if (!user) {
    const [newUser] = await db.insert(users).values({ email, name: "Frank" }).returning();
    user = newUser;
  }

  // 2. Generate stateless magic link token
  const token = createMagicLinkToken(user.email, user.lastLoginAt);
  console.log("Generated Magic Token (stateless, 0 DB rows):", token.slice(0, 35) + "...");

  // 3. Send via local Mailpit
  const mailer = getMailer();
  const magicLinkUrl = `http://localhost:3000/api/auth/verify?token=${encodeURIComponent(token)}`;
  const emailContent = generateMagicLinkEmail({ email: user.email, magicLinkUrl });

  const sendResult = await mailer.sendEmail({
    to: user.email,
    ...emailContent,
  });
  console.log("Email dispatch result:", sendResult);

  // 4. Verify token
  const verifyResult = verifyMagicLinkToken(token, user.lastLoginAt);
  console.log("Token Verification Check:", verifyResult);
  if (!verifyResult.valid) throw new Error("Verification failed");

  // 5. Update lastLoginAt (simulating single-use invalidation)
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  // 6. Test replay: should fail now!
  const updatedUser = (await db.select().from(users).where(eq(users.id, user.id)))[0];
  const replayResult = verifyMagicLinkToken(token, updatedUser.lastLoginAt);
  console.log("Replay Prevention Check (should be invalid):", replayResult);

  // 7. Create 30-day session
  const sessionToken = createSessionToken({ id: user.id, email: user.email, name: user.name });
  const sessionVerify = verifySessionToken(sessionToken);
  console.log("30-Day Session Verification Check:", sessionVerify);

  console.log("\nALL MAGIC LINK & SESSION CHECKS PASSED!");
}

testFullMagicLinkFlow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
