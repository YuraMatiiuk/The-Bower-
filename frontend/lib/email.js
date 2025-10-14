// lib/email.js
import nodemailer from "nodemailer";

export function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP environment variables missing");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for others
    auth: { user, pass },
  });
}

export async function sendMail({ to, subject, html, text }) {
  const transporter = createTransport();
  const from = process.env.SMTP_FROM || "no-reply@bower.org.au";
  return transporter.sendMail({ from, to, subject, html, text });
}