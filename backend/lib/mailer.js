// Sends email from the shop (sign-in links). Uses the shop's Gmail by default:
// SMTP_USER = the shop's Gmail address, SMTP_PASS = a Gmail "app password" (set on Render, never in git).
// Optional: SMTP_HOST (default smtp.gmail.com), SMTP_PORT (default 465), MAIL_FROM (default SMTP_USER).
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 465);
export const mailEnabled = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const transport = mailEnabled
  ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
  : null;

export async function sendMail({ to, subject, text, html }) {
  if (!transport) throw new Error("Email isn't set up (SMTP_USER / SMTP_PASS missing)");
  const from = process.env.MAIL_FROM || `Venture Creations <${process.env.SMTP_USER}>`;
  await transport.sendMail({ from, to, subject, text, html });
}
