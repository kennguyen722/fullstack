import dotenv from 'dotenv';
import { Secret } from 'jsonwebtoken';
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4300),
  jwtSecret: (process.env.JWT_SECRET || 'change_me') as Secret,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5300',
  // Admin email used for seeding and identifying the public profile
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  // Admin password used for seeding and optional reset; do not expose publicly
  adminPassword: process.env.ADMIN_PASSWORD || 'password',
  // SMTP for email sending (optional; if not set, we will log reset links to console)
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpSecure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  mailFrom: process.env.MAIL_FROM || 'no-reply@localhost'
};
