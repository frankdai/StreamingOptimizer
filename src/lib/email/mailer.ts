import nodemailer from "nodemailer";
import { Resend } from "resend";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }>;
}

/**
 * Local Mailpit SMTP Mailer (sends to localhost:1025)
 */
export class MailpitMailer implements Mailer {
  private transporter: nodemailer.Transporter;

  constructor(host = process.env.MAILPIT_HOST || "localhost", port = Number(process.env.MAILPIT_PORT) || 1025) {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      ignoreTLS: true,
    });
  }

  async sendEmail(options: SendEmailOptions) {
    try {
      const info = await this.transporter.sendMail({
        from: '"Stream Optimizer" <alerts@streamoptimizer.local>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log(`[Mailpit] Email sent to ${options.to}: ${info.messageId} (View at http://localhost:8025)`);
      return { success: true, id: info.messageId };
    } catch (err: any) {
      console.warn(`[Mailpit Warning] Could not connect to Mailpit on port 1025 (${err.message}). Logging to console:`);
      console.log(`--- EMAIL PREVIEW ---`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(options.text);
      console.log(`---------------------`);
      return { success: true, id: "console-fallback" };
    }
  }
}

/**
 * Production Resend Mailer
 */
export class ResendMailer implements Mailer {
  private client: Resend;

  constructor(apiKey = process.env.RESEND_API_KEY) {
    if (!apiKey) {
      console.warn("[Resend] Missing RESEND_API_KEY. Emails will not send.");
    }
    this.client = new Resend(apiKey);
  }

  async sendEmail(options: SendEmailOptions) {
    try {
      const result = await this.client.emails.send({
        from: "Stream Optimizer <alerts@streamoptimizer.app>",
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return { success: true, id: result.data?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

/**
 * Get active mailer instance based on environment
 */
export function getMailer(): Mailer {
  const provider = process.env.EMAIL_PROVIDER || (process.env.NODE_ENV === "production" ? "resend" : "mailpit");

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    return new ResendMailer();
  }
  return new MailpitMailer();
}
