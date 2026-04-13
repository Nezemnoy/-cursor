import nodemailer from "nodemailer";
import "dotenv/config";

// Sends the digest email via SMTP (Nodemailer).
// Reads all config from environment variables.
export async function sendEmail({ subject, html, text }) {
  const recipients = (process.env.DIGEST_RECIPIENTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  if (recipients.length === 0) {
    console.warn("No DIGEST_RECIPIENTS configured — skipping send.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  let info;
  try {
    info = await transporter.sendMail({
      from: process.env.DIGEST_FROM ?? process.env.SMTP_USER,
      to: recipients.join(", "),
      subject,
      text,
      html,
    });
  } catch (err) {
    if (err.code === "EAUTH") {
      console.error(
        "Email auth failed. For Gmail: enable 2-Step Verification, then create an App Password at\n" +
        "  https://myaccount.google.com/apppasswords\n" +
        "and set SMTP_USER=your@gmail.com and SMTP_PASS=<16-char app password> in .env"
      );
    } else {
      console.error("Email send failed:", err.message);
    }
    return;
  }

  console.log(`Email sent: ${info.messageId} → ${recipients.join(", ")}`);
}
