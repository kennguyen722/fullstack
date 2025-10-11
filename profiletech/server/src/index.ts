import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pkg from '@prisma/client';
import { config } from './config.js';
import { z } from 'zod';
import path from 'path';
import { promises as fs } from 'fs';
import multer from 'multer';
import crypto from 'crypto';

const { PrismaClient } = pkg as any;
const prisma = new PrismaClient();
const app = express();
app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
// Avoid 304s on API responses and ensure fresh content
app.set('etag', false);
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Ensure password reset table exists (raw SQL; avoids migration for SQLite)
async function ensurePasswordResetTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expiresAt DATETIME NOT NULL,
        usedAt DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.error('Failed to ensure password_resets table:', (e as any)?.message || e);
  }
}
ensurePasswordResetTable();

// Email helper (optional)
async function sendResetEmail(to: string, resetUrl: string) {
  const canSend = Boolean(config.smtpHost && config.smtpUser && config.smtpPass);
  if (!canSend) {
    console.log('[RESET LINK]', resetUrl);
    return;
  }
  try {
    // Dynamic import to avoid hard dependency during local builds
    const nodemailerMod: any = await import('nodemailer');
    const nm: any = nodemailerMod?.default ?? nodemailerMod;
    const transporter: any = nm.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: { user: config.smtpUser, pass: config.smtpPass }
    } as any);
    await transporter.sendMail({
      from: config.mailFrom,
      to,
      subject: 'Reset your password',
      html: `<p>You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>
             <p>If you didn't request this, you can ignore this email.</p>`
    });
  } catch (e) {
    console.error('Failed to send reset email:', (e as any)?.message || e);
    console.log('[RESET LINK]', resetUrl);
  }
}

// Public profile (for dashboard default view)
app.get('/api/profile/public', async (_req, res) => {
  // Prefer the env-configured admin email; if not found, fallback to any ADMIN user's profile
  let profile = await prisma.profile.findFirst({
    where: { user: { email: config.adminEmail } },
    include: { experiences: true, educations: true, leaderships: true, skills: true }
  });
  if (!profile) {
    profile = await prisma.profile.findFirst({
      where: { user: { role: 'ADMIN' as any } },
      include: { experiences: true, educations: true, leaderships: true, skills: true },
      orderBy: { userId: 'asc' }
    });
  }
  res.json({ profile });
});

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body as { email: string; password: string; name: string };
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  // Allow self-registration only on first deploy or when no profile exists yet
  try {
    const [userCount, profileCount] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count()
    ]);
    // Permit registration if either there are no users yet OR there is no profile data yet
    const registrationOpen = userCount === 0 || profileCount === 0;
    if (!registrationOpen) {
      return res.status(403).json({ error: 'Registration is disabled. Please sign in with an existing account.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check registration availability' });
  }
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { email, password: hashed, name, role: 'USER' as any } });
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    return res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// Request password reset (email)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const email = String((req.body?.email ?? '') as string).trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond OK to avoid enumeration
    if (!user) return res.json({ ok: true });
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    // store token
    await prisma.$executeRawUnsafe(
      'INSERT INTO password_resets (userId, token, expiresAt) VALUES (?, ?, ?)',
      user.id,
      token,
      expiresAt.toISOString()
    );
    const resetUrl = `${config.clientUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
    await sendResetEmail(email, resetUrl);
    return res.json({ ok: true });
  } catch (e) {
    console.error('forgot-password error:', (e as any)?.message || e);
    return res.json({ ok: true }); // still OK to avoid leaking details
  }
});

// Complete password reset with token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const token = String((req.body?.token ?? '')).trim();
    const newPassword = String((req.body?.newPassword ?? '')).trim();
    if (!token || !newPassword) return res.status(400).json({ error: 'Missing token or new password' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    // Lookup token
    const row: any = await prisma.$queryRawUnsafe('SELECT * FROM password_resets WHERE token = ? LIMIT 1', token);
    const rec = Array.isArray(row) ? row[0] : row;
    if (!rec) return res.status(400).json({ error: 'Invalid or expired token' });
    if (rec.usedAt) return res.status(400).json({ error: 'Token already used' });
    const now = Date.now();
    const exp = new Date(rec.expiresAt).getTime();
    if (!exp || now > exp) return res.status(400).json({ error: 'Invalid or expired token' });
    // Update password
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: Number(rec.userId) }, data: { password: hashed } });
    // Mark token used and remove other outstanding tokens for this user
    await prisma.$executeRawUnsafe('UPDATE password_resets SET usedAt = ? WHERE token = ?', new Date().toISOString(), token);
    await prisma.$executeRawUnsafe('DELETE FROM password_resets WHERE userId = ? AND (usedAt IS NOT NULL OR expiresAt < ?)', Number(rec.userId), new Date().toISOString());
    return res.json({ ok: true });
  } catch (e) {
    console.error('reset-password error:', (e as any)?.message || e);
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
});

function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing token' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, config.jwtSecret) as string | JwtPayload;
    const sub = typeof payload === 'string' ? undefined : payload.sub;
    const userId = typeof sub === 'string' ? Number(sub) : sub;
    if (!userId || Number.isNaN(userId)) return res.status(401).json({ error: 'Invalid token' });
    (req as any).userId = userId as number;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// Profile endpoints
app.get('/api/profile/me', auth, async (req, res) => {
  const userId = (req as any).userId as number;
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { experiences: true, educations: true, leaderships: true, skills: true }
  });
  res.json({ profile });
});

// Allow any authenticated user to create/update their own profile
app.put('/api/profile/me', auth, async (req, res) => {
  const userId = (req as any).userId as number;
  // Coerce date-ish values: '', null, undefined => undefined; valid string/Date => Date
  const dateish = z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return undefined;
    if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;
    if (typeof val === 'string') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  }, z.date().optional());

  const schema = z.object({
    headline: z.string().optional().default(''),
    summary: z.string().optional().default(''),
    displayName: z.string().optional().default(''),
    // Allow relative URLs (e.g., /assets/profile/...) or full http(s) URLs, or empty
    photoUrl: z
      .string()
      .trim()
      .optional()
      .default('')
      .refine((s) => s === '' || s.startsWith('/') || /^https?:\/\//i.test(s), {
        message: 'Invalid URL'
      }),
    location: z.string().optional().default(''),
    address: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    availability: z.string().optional().default(''),
    focusAreas: z.string().optional().default(''),
    // Email: trim and accept empty or valid email; coerce invalid to empty
    email: z.preprocess((val) => {
      if (val === null || val === undefined) return '';
      const s = String(val).trim();
      if (!s) return '';
      // basic email check; Zod will also enforce
      const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return basic.test(s) ? s : '';
    }, z.string().email().optional().or(z.literal('')).default('')),
    // Normalize linkedin/github to absolute URLs if user omits scheme
    linkedin: z
      .preprocess((val) => {
        if (val === null || val === undefined) return '';
        let s = String(val).trim();
        if (!s) return '';
        if (!/^https?:\/\//i.test(s)) {
          if (/^www\./i.test(s) || /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/|$)/i.test(s)) s = `https://${s}`;
        }
        try { new URL(s); return s; } catch { return ''; }
      }, z.string().url().optional().or(z.literal('')).default('')),
    github: z
      .preprocess((val) => {
        if (val === null || val === undefined) return '';
        let s = String(val).trim();
        if (!s) return '';
        if (!/^https?:\/\//i.test(s)) {
          if (/^www\./i.test(s) || /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/|$)/i.test(s)) s = `https://${s}`;
        }
        try { new URL(s); return s; } catch { return ''; }
      }, z.string().url().optional().or(z.literal('')).default('')),
    experiences: z
      .array(
        z.object({
          company: z.string().optional().default(''),
          role: z.string().optional().default(''),
          startDate: dateish,
          endDate: dateish.nullable().optional(),
          description: z.string().optional().default('')
        })
      )
      .optional()
      .default([]),
    educations: z
      .array(
        z.object({
          school: z.string().optional().default(''),
          degree: z.string().optional().default(''),
          field: z.string().optional().default(''),
          startDate: dateish,
          endDate: dateish.nullable().optional(),
          description: z.string().optional().default('')
        })
      )
      .optional()
      .default([]),
    leaderships: z
      .array(
        z.object({
          organization: z.string().optional().default(''),
          title: z.string().optional().default(''),
          startDate: dateish,
          endDate: dateish.nullable().optional(),
          description: z.string().optional().default('')
        })
      )
      .optional()
      .default([]),
    skills: z
      .array(
        z.object({
          description: z.string().optional().default('')
        })
      )
      .optional()
      .default([])
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const { headline, summary, displayName, photoUrl, location, address, phone, availability, focusAreas, email, linkedin, github, experiences, educations, leaderships, skills } = parsed.data as any;

  // Sanitize and filter items (ignore completely empty rows)
  const saneExperiences = Array.isArray(experiences) ? experiences
    .map((e: any) => ({
      company: (e?.company ?? '').toString().trim(),
      role: (e?.role ?? '').toString().trim(),
      startDate: e?.startDate as Date | undefined,
      endDate: (e?.endDate as Date | undefined) ?? undefined,
      description: (e?.description ?? '').toString().trim()
    }))
    .filter(e => e.company || e.role || e.description || e.startDate || e.endDate)
    // Require minimally company, role, startDate
    .filter(e => e.company && e.role && e.startDate) : [];

  const saneEducations = Array.isArray(educations) ? educations
    .map((ed: any) => ({
      school: (ed?.school ?? '').toString().trim(),
      degree: (ed?.degree ?? '').toString().trim(),
      field: (ed?.field ?? '').toString().trim(),
      startDate: ed?.startDate as Date | undefined,
      endDate: (ed?.endDate as Date | undefined) ?? undefined,
      description: (ed?.description ?? '').toString().trim()
    }))
    .filter(ed => ed.school || ed.degree || ed.field || ed.description || ed.startDate || ed.endDate)
    .filter(ed => ed.school && ed.degree && ed.field && ed.startDate) : [];

  const saneLeaderships = Array.isArray(leaderships) ? leaderships
    .map((l: any) => ({
      organization: (l?.organization ?? '').toString().trim(),
      title: (l?.title ?? '').toString().trim(),
      startDate: l?.startDate as Date | undefined,
      endDate: (l?.endDate as Date | undefined) ?? undefined,
      description: (l?.description ?? '').toString().trim()
    }))
    .filter(l => l.organization || l.title || l.description || l.startDate || l.endDate)
    .filter(l => l.organization && l.title && l.startDate) : [];

  const saneSkills = Array.isArray(skills) ? skills
    .map((s: any) => ({
      description: (s?.description ?? '').toString().trim()
    }))
    .filter(s => s.description) : [];

  try {
  await prisma.$transaction(async (tx: any) => {
      const upsert = await tx.profile.upsert({
        where: { userId },
        create: { userId, headline: headline || '', summary: summary || '', displayName: displayName || '', photoUrl: photoUrl || '', location: location || '', address: address || '', phone: phone || '', availability: availability || '', focusAreas: focusAreas || '', email: email || '', linkedin: linkedin || '', github: github || '' },
        update: { headline: headline || '', summary: summary || '', displayName: displayName || '', photoUrl: photoUrl || '', location: location || '', address: address || '', phone: phone || '', availability: availability || '', focusAreas: focusAreas || '', email: email || '', linkedin: linkedin || '', github: github || '' }
      });

      // Replace children for simplicity
      await tx.experience.deleteMany({ where: { profileId: upsert.id } });
      await tx.education.deleteMany({ where: { profileId: upsert.id } });
      await tx.leadership.deleteMany({ where: { profileId: upsert.id } });
      await tx.skill.deleteMany({ where: { profileId: upsert.id } });

      // Insert sanitized children
      for (const e of saneExperiences) {
        await tx.experience.create({
          data: {
            profileId: upsert.id,
            company: e.company,
            role: e.role,
            startDate: e.startDate!,
            endDate: e.endDate ?? null,
            description: e.description
          }
        });
      }
      for (const ed of saneEducations) {
        await tx.education.create({
          data: {
            profileId: upsert.id,
            school: ed.school,
            degree: ed.degree,
            field: ed.field,
            startDate: ed.startDate!,
            endDate: ed.endDate ?? null,
            description: ed.description
          }
        });
      }
      for (const l of saneLeaderships) {
        await tx.leadership.create({
          data: {
            profileId: upsert.id,
            organization: l.organization,
            title: l.title,
            startDate: l.startDate!,
            endDate: l.endDate ?? null,
            description: l.description
          }
        });
      }
      if (saneSkills.length) {
        await tx.skill.createMany({
          data: saneSkills.map(s => ({ profileId: upsert.id, description: s.description }))
        });
      }
    });

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Error saving profile:', err?.message || err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Upload profile photo as base64 data URL and save it under client/public/profile
// Configure multer storage for profile photos
const uploadDir = path.resolve(process.cwd(), '../client/public/assets/profile');
const storage = multer.diskStorage({
  destination: async (_req: any, _file: any, cb: any) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (e) {
      cb(e, uploadDir);
    }
  },
  filename: (req: any, file: any, cb: any) => {
    const userId = (req as any).userId as number;
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `profile-${userId}-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (_req: any, file: any, cb: any) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Only image uploads allowed'));
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Allow any authenticated user to upload their own profile photo
app.post('/api/profile/photo', auth, upload.single('file'), async (req: any, res) => {
  try {
    const file = req.file as any;
    if (!file) return res.status(400).json({ error: 'Missing file' });
    const filename = file.filename;
    const url = `/assets/profile/${filename}`;
    const userId = (req as any).userId as number;
    try {
      await prisma.profile.update({ where: { userId }, data: { photoUrl: url } });
    } catch {
      // If profile doesn't exist yet, create a minimal one
      await prisma.profile.create({ data: { userId, headline: '', summary: '', photoUrl: url } });
    }
    return res.json({ url });
  } catch (err: any) {
    console.error('Upload error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Account management endpoints (admin only)
// Get current email and defaults (do not expose actual current password)
app.get('/api/account/credentials', auth, requireAdmin, async (req, res) => {
  const userId = (req as any).userId as number;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const reveal = String((req.query?.reveal ?? '') as any) === '1';
  res.json({
    email: user.email,
    defaultEmail: config.adminEmail,
    defaultPassword: config.adminPassword ? (reveal ? String(config.adminPassword) : '********') : ''
  });
});

// Change password (requires current password for safety)
app.put('/api/account/password', auth, requireAdmin, async (req, res) => {
  const userId = (req as any).userId as number;
  const body = (req.body || {}) as { currentPassword?: string; newPassword?: string };
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  res.json({ ok: true });
});

// Reset credentials back to defaults from env
app.post('/api/account/reset', auth, requireAdmin, async (req, res) => {
  const userId = (req as any).userId as number;
  const email = config.adminEmail;
  const rawPassword = config.adminPassword;
  if (!email || !rawPassword) return res.status(400).json({ error: 'Default admin credentials not configured' });
  const hashed = await bcrypt.hash(rawPassword, 10);
  try {
    const user = await prisma.user.update({ where: { id: userId }, data: { email, password: hashed, role: 'ADMIN' as any } });
    res.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (err: any) {
    return res.status(400).json({ error: 'Failed to reset credentials (email may be in use)' });
  }
});

// Change email (requires current password)
app.put('/api/account/email', auth, requireAdmin, async (req, res) => {
  const userId = (req as any).userId as number;
  const body = (req.body || {}) as { currentPassword?: string; newEmail?: string };
  const currentPassword = String(body.currentPassword || '');
  const newEmail = String(body.newEmail || '').trim();
  if (!currentPassword || !newEmail) return res.status(400).json({ error: 'Missing fields' });
  const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basic.test(newEmail)) return res.status(400).json({ error: 'Enter a valid email address' });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  try {
    const updated = await prisma.user.update({ where: { id: userId }, data: { email: newEmail } });
    return res.json({ ok: true, user: { id: updated.id, email: updated.email } });
  } catch (err: any) {
    return res.status(400).json({ error: 'Email already in use' });
  }
});

app.listen(config.port, () => {
  console.log(`[profiletech] server on http://localhost:${config.port}`);
});
