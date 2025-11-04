import nodemailer from "nodemailer";

export function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

export async function safeSendMail(opts) {
  // Protect against missing recipient
  if (!opts?.to || typeof opts.to !== "string") {
    console.warn('email.send skipped: missing "to"', { to: opts?.to });
    return { skipped: true };
  }
  // Protect against missing from
  const from = opts.from || process.env.SMTP_FROM || "no-reply@example.com";
  const transporter = createTransport();
  return transporter.sendMail({ ...opts, from });
}