import nodemailer from "nodemailer";

const host = process.env["SMTP_HOST"];
const port = Number(process.env["SMTP_PORT"] ?? 465);
const user = process.env["SMTP_USER"];
const pass = process.env["SMTP_PASS"];
const from = process.env["SMTP_FROM"] ?? user ?? "no-reply@localhost";

export const smtpConfigured = Boolean(host && user && pass);

const transporter = smtpConfigured
  ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
  : null;

/** Sends an email. Never throws: returns false (and logs) if SMTP is missing or fails. */
export async function sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!transporter) {
    console.warn("[mail] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS); email not sent to", to);
    return false;
  }
  try {
    await transporter.sendMail({ from, to, subject, html, text });
    return true;
  } catch (err) {
    console.error("[mail] send failed:", (err as Error).message);
    return false;
  }
}
