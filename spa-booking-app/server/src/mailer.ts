import nodemailer from "nodemailer";
import { config } from "./config.js";

export function createTransport() {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    // Fallback "console" transport: prints emails to console
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true
    } as any);
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false,
    auth: { user: config.smtp.user, pass: config.smtp.pass }
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  const transporter = createTransport();
  const info = await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html
  });
  if ((info as any).message) {
    console.log("[MAIL] Preview:\n" + (info as any).message.toString());
  } else {
    console.log("[MAIL] Sent:", info.messageId);
  }
}
