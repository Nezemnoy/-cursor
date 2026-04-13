import nodemailer from "nodemailer";
import { getConfig } from "./config.js";

export async function sendEmail({ subject, html, text }) {
  const { smtp, from, recipients } = getConfig();

  if (recipients.length === 0) {
    console.warn("No recipients configured — skipping send.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host:   smtp.host,
    port:   smtp.port,
    secure: smtp.secure,
    auth:   { user: smtp.user, pass: smtp.pass },
  });

  let info;
  try {
    info = await transporter.sendMail({ from, to: recipients.join(", "), subject, text, html });
  } catch (err) {
    if (err.code === "EAUTH") {
      console.error(
        "Email auth failed. For Gmail: enable 2-Step Verification, then create an App Password at\n" +
        "  https://myaccount.google.com/apppasswords\n" +
        "and update SMTP credentials in the admin panel."
      );
    } else {
      console.error("Email send failed:", err.message);
    }
    return;
  }

  console.log(`Email sent: ${info.messageId} → ${recipients.join(", ")}`);
}
