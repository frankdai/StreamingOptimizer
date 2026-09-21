export interface SubscriptionAlertData {
  userName?: string;
  streamingService: string;
  startDate: string;
  endDate: string;
  cost: number;
  coveredShowTitles: string[];
}

/**
 * Generate email for upcoming subscription start date
 */
export function generateSubscribeAlertEmail(data: SubscriptionAlertData): {
  subject: string;
  text: string;
  html: string;
} {
  const showsList = data.coveredShowTitles.map((title) => `• ${title}`).join("\n");
  const showsHtml = data.coveredShowTitles
    .map((title) => `<li style="margin: 4px 0; font-weight: 500;">${title}</li>`)
    .join("");

  const subject = `🍿 Time to subscribe to ${data.streamingService} (Starts ${data.startDate})`;

  const text = `Hi ${data.userName || "there"},

Your optimized watch window for ${data.streamingService} starts on ${data.startDate}:

Shows ready to watch:
${showsList}

Subscription Details:
- Service: ${data.streamingService}
- Active Window: ${data.startDate} to ${data.endDate} (30 days)
- Estimated Cost: $${data.cost.toFixed(2)}

💡 Smart Tip:
As soon as you subscribe, immediately navigate to your account settings and click "Cancel Auto-Renewal". 
Because streaming services bill for a full non-prorated month, your access will remain 100% active until ${data.endDate}, and you won't get billed for next month!

Happy watching,
Stream Optimizer Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; }
    .header { border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 700; color: #38bdf8; margin: 0; }
    .badge { display: inline-block; background: #0284c7; color: white; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 8px; }
    .tip-box { background: #0c4a6e; border-left: 4px solid #38bdf8; padding: 12px 16px; border-radius: 6px; margin-top: 20px; }
    .details { background: #0f172a; padding: 12px; border-radius: 8px; margin: 16px 0; }
    ul { padding-left: 20px; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 class="title">🍿 Time to Subscribe to ${data.streamingService}</h2>
      <div class="badge">Starts ${data.startDate}</div>
    </div>
    
    <p>Hi ${data.userName || "there"},</p>
    <p>Your optimized 30-day viewing window for <strong>${data.streamingService}</strong> is starting:</p>
    
    <div class="details">
      <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px;">READY TO WATCH:</p>
      <ul>${showsHtml}</ul>
      <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Active Window:</strong> ${data.startDate} &rarr; ${data.endDate}</p>
      <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Estimated Charge:</strong> $${data.cost.toFixed(2)}</p>
    </div>

    <div class="tip-box">
      <strong style="color: #38bdf8;">💡 Pro Tip for Maximum Value:</strong>
      <p style="margin: 6px 0 0 0; font-size: 13px; line-height: 1.4;">
        As soon as you subscribe, go straight to account settings and hit <strong>Cancel Auto-Renewal</strong>. 
        Your subscription remains fully active through <strong>${data.endDate}</strong>, avoiding accidental recurring charges.
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Generate email for upcoming subscription cancellation / expiration
 */
export function generateCancelAlertEmail(data: SubscriptionAlertData): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `⏰ Reminder: Your ${data.streamingService} window ends on ${data.endDate}`;

  const text = `Hi ${data.userName || "there"},

Friendly reminder that your 30-day watch window for ${data.streamingService} expires on ${data.endDate}.

Action Checklist:
1. Ensure your auto-renewal is turned OFF in your ${data.streamingService} account settings so you are not charged next month.
2. Finish any remaining episodes of: ${data.coveredShowTitles.join(", ")}.

Stream Optimizer Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; }
    .warning { border-left: 4px solid #f59e0b; background: #451a03; padding: 12px 16px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="color: #f59e0b; margin-top: 0;">⏰ ${data.streamingService} Window Ending Soon</h2>
    <p>Hi ${data.userName || "there"},</p>
    <div class="warning">
      <strong>Your subscription expires on ${data.endDate}</strong>
      <p style="margin: 6px 0 0 0; font-size: 13px;">
        Double check that auto-renewal is disabled in your account so you aren't charged for another month.
      </p>
    </div>
    <p style="margin-top: 16px; font-size: 14px; color: #94a3b8;">
      Completed shows in this cycle: <strong>${data.coveredShowTitles.join(", ")}</strong>
    </p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
