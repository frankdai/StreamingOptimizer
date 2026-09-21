import { getMailer } from "../lib/email/mailer";
import { generateSubscribeAlertEmail } from "../lib/email/templates";

async function testEmail() {
  const mailer = getMailer();
  const emailData = generateSubscribeAlertEmail({
    userName: "Frank",
    streamingService: "Apple TV+",
    startDate: "2025-01-15",
    endDate: "2025-02-14",
    cost: 9.99,
    coveredShowTitles: ["Severance (Season 2)", "Silo (Season 2)"],
  });

  console.log("Sending test email to Mailpit on localhost:1025...");
  const res = await mailer.sendEmail({
    to: "frank@example.com",
    ...emailData,
  });
  console.log("Result:", res);
}

testEmail()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
