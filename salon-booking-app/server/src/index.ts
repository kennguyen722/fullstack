import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 4301);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5301';
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

// CORS: allow configured client plus common localhost variants in dev
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean)) || [
    CLIENT_URL,
    'http://localhost:5301',
    'http://127.0.0.1:5301',
  ]
);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests like curl/postman without origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// Static serving for uploaded files
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOAD_DIR));

// Types
type Role = 'ADMIN' | 'EMPLOYEE';
type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELED';

// Auth helpers
type JWTPayload = { id: number; role: Role };
function signToken(payload: JWTPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function auth(required: boolean = true, roles?: Role[]) {
  return async (req: Request & { user?: JWTPayload }, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header) {
      if (required) return res.status(401).json({ error: 'Unauthorized' });
      return next();
    }
    const token = header.replace('Bearer ', '').trim();
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      req.user = decoded;
      if (roles && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (e) {
      if (required) return res.status(401).json({ error: 'Unauthorized' });
      next();
    }
  };
}

// Schemas
const registerSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const loginSchema = registerSchema;

const serviceCategorySchema = z.object({ name: z.string().min(2), desc: z.string().optional() });
const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  durationMin: z.number().int().positive(),
  categoryId: z.number().int().positive(),
});

const employeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
  serviceIds: z.array(z.number().int().positive()).optional(),
});

const shiftSchema = z.object({ employeeId: z.number().int().positive(), start: z.string(), end: z.string() });
const appointmentSchema = z.object({
  employeeId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  clientBirthday: z.string().optional(),
  notes: z.string().optional(),
  start: z.string(),
});

// Health
app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

// Auth
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hash, role: 'EMPLOYEE' } });
  const token = signToken({ id: user.id, role: user.role as Role });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ id: user.id, role: user.role as Role });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/api/auth/me', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json({ id: u.id, email: u.email, role: u.role });
});

// Services & categories (Admin)
app.get('/api/categories', auth(false), async (_req: Request, res: Response) => {
  const categories = await prisma.serviceCategory.findMany({ include: { services: true } });
  res.json(categories);
});

app.post('/api/categories', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  const parsed = serviceCategorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const cat = await prisma.serviceCategory.create({ data: parsed.data });
  res.json(cat);
});

app.post('/api/services', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const svc = await prisma.service.create({ data: parsed.data });
  res.json(svc);
});

app.put('/api/services/:id', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = serviceSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const svc = await prisma.service.update({ where: { id }, data: parsed.data });
  res.json(svc);
});

app.delete('/api/services/:id', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.service.delete({ where: { id } });
  res.json({ ok: true });
});

// Employees
app.get('/api/employees', auth(true, ['ADMIN']), async (_req: Request, res: Response) => {
  const employees = await prisma.employee.findMany({ include: { user: true, skills: { include: { service: true } } } });
  res.json(employees);
});

// Team employees (for Employee role - minimal fields)
app.get('/api/team/employees', auth(true), async (_req: Request & { user?: JWTPayload }, res: Response) => {
  const employees = await prisma.employee.findMany({ select: { id: true, firstName: true, lastName: true, photoUrl: true } });
  res.json(employees);
});

app.post('/api/employees', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  
  let { email, password, role = 'EMPLOYEE', serviceIds = [], ...rest } = parsed.data;
  
  // Use default password if not provided or empty
  if (!password || password.trim() === '') {
    password = 'Welcome123!';
  }
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'Email already exists' });
  }
  
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash, role } });
    const emp = await prisma.employee.create({ data: { userId: user.id, ...rest } });
    
    if (serviceIds.length) {
      await prisma.employeeSkill.createMany({ 
        data: serviceIds.map((sid: number) => ({ employeeId: emp.id, serviceId: sid })) 
      });
    }
    
    const full = await prisma.employee.findUnique({ 
      where: { id: emp.id }, 
      include: { user: true, skills: { include: { service: true } } } 
    });
    res.json(full);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

app.put('/api/employees/:id', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = employeeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, role, serviceIds, ...rest } = parsed.data;
  
  // Get the employee first to get the userId
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  
  // Update user data if provided
  if (email || (password && password.trim() !== '') || role) {
    const userData: any = {};
    if (email) userData.email = email;
    if (password && password.trim() !== '') userData.password = await bcrypt.hash(password, 10);
    if (role) userData.role = role;
    await prisma.user.update({ where: { id: emp.userId }, data: userData });
  }
  
  // Update employee data if provided
  if (Object.keys(rest).length) {
    await prisma.employee.update({ where: { id }, data: rest });
  }
  
  // Update skills if provided
  if (serviceIds !== undefined) {
    await prisma.employeeSkill.deleteMany({ where: { employeeId: id } });
    if (serviceIds.length > 0) {
      await prisma.employeeSkill.createMany({ 
        data: serviceIds.map((sid: number) => ({ employeeId: id, serviceId: sid })) 
      });
    }
  }
  
  const full = await prisma.employee.findUnique({ 
    where: { id }, 
    include: { user: true, skills: { include: { service: true } } } 
  });
  res.json(full);
});

app.delete('/api/employees/:id', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return res.status(404).json({ error: 'Not found' });
  await prisma.employeeSkill.deleteMany({ where: { employeeId: id } });
  await prisma.shift.deleteMany({ where: { employeeId: id } });
  await prisma.appointment.deleteMany({ where: { employeeId: id } });
  await prisma.employee.delete({ where: { id } });
  await prisma.user.delete({ where: { id: emp.userId } });
  res.json({ ok: true });
});

// Shifts (Admin)
app.get('/api/shifts', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  const empId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
  const startQ = req.query.start ? new Date(String(req.query.start)) : undefined;
  const endQ = req.query.end ? new Date(String(req.query.end)) : undefined;
  const where: any = {};
  if (empId) where.employeeId = empId;
  if (startQ && endQ) {
    // Return shifts that overlap the [startQ, endQ] time window
    where.AND = [
      { start: { lt: endQ } },
      { end: { gt: startQ } },
    ];
  } else if (startQ) {
    where.end = { gt: startQ };
  } else if (endQ) {
    where.start = { lt: endQ };
  }
  const shifts = await prisma.shift.findMany({ where, include: { employee: true } });
  res.json(shifts);
});

app.post('/api/shifts', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  const parsed = shiftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { employeeId, start, end } = parsed.data;
  if (new Date(end) <= new Date(start)) return res.status(400).json({ error: 'Shift end must be after start' });
  const overlap = await prisma.shift.findFirst({ where: { employeeId, start: { lt: new Date(end) }, end: { gt: new Date(start) } } });
  if (overlap) return res.status(409).json({ error: 'Shift overlaps with existing one' });
  const shift = await prisma.shift.create({ data: { employeeId, start: new Date(start), end: new Date(end) } });
  res.json(shift);
});

// Bulk create shifts (Admin): generate from weekly template across N weeks starting at startDate (expected Monday)
const dayTemplateSchema = z.object({ day: z.number().int().min(1).max(7), startTime: z.string(), endTime: z.string() });
const bulkShiftsSchema = z.object({
  employeeId: z.number().int().positive(),
  startDate: z.string(), // YYYY-MM-DD; Monday of first week preferred
  weeks: z.number().int().min(1).max(26),
  weekTemplate: z.array(dayTemplateSchema).min(1)
});

app.post('/api/shifts/bulk', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  const parsed = bulkShiftsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { employeeId, startDate, weeks, weekTemplate } = parsed.data;

  const start = new Date(startDate + 'T00:00:00');
  // Normalize to Monday start (if not already): getDay() 0=Sun -> shift to Monday
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day; // if Sunday, go back 6; else 1 - day
  const firstMonday = new Date(start);
  firstMonday.setDate(start.getDate() + diffToMonday);

  const created: any[] = [];
  let skipped = 0;
  for (let w = 0; w < weeks; w++) {
    const weekBase = new Date(firstMonday);
    weekBase.setDate(firstMonday.getDate() + w * 7);
    for (const tpl of weekTemplate) {
      const dayIdx = tpl.day; // 1=Mon..7=Sun
      const date = new Date(weekBase);
      date.setDate(weekBase.getDate() + (dayIdx - 1));

      const [sh, sm] = tpl.startTime.split(':').map((s) => Number(s));
      const [eh, em] = tpl.endTime.split(':').map((s) => Number(s));
      const startDt = new Date(date); startDt.setHours(sh, sm || 0, 0, 0);
      const endDt = new Date(date); endDt.setHours(eh, em || 0, 0, 0);
      if (endDt <= startDt) { skipped++; continue; }
      const exists = await prisma.shift.findFirst({ where: { employeeId, start: { lt: endDt }, end: { gt: startDt } } });
      if (exists) { skipped++; continue; }
      const s = await prisma.shift.create({ data: { employeeId, start: startDt, end: endDt } });
      created.push(s);
    }
  }
  res.json({ ok: true, count: created.length, skipped, shifts: created });
});

// Allow delete by admin or owner
app.delete('/api/shifts/:id', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  const id = Number(req.params.id);
  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift) return res.status(404).json({ error: 'Not found' });
  if (req.user!.role !== 'ADMIN') {
    const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
    if (!me || me.id !== shift.employeeId) return res.status(403).json({ error: 'Forbidden' });
  }
  await prisma.shift.delete({ where: { id } });
  res.json({ ok: true });
});

// Update shift (Admin or owner can update times; only admin can reassign employeeId)
app.put('/api/shifts/:id', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.shift.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  // Permission check
  let canEditEmployee = false;
  if (req.user!.role === 'ADMIN') {
    canEditEmployee = true;
  } else {
    const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
    if (!me || me.id !== existing.employeeId) return res.status(403).json({ error: 'Forbidden' });
  }

  const { employeeId, start, end } = req.body as Partial<{ employeeId: number; start: string; end: string }>;
  const data: any = {};
  if (typeof start === 'string') data.start = new Date(start);
  if (typeof end === 'string') data.end = new Date(end);
  if (data.start && data.end && data.end <= data.start) return res.status(400).json({ error: 'Shift end must be after start' });
  if (typeof employeeId === 'number') {
    if (!canEditEmployee) return res.status(403).json({ error: 'Only admin can reassign shifts' });
    data.employeeId = employeeId;
  }
  const nextStart = data.start ?? existing.start;
  const nextEnd = data.end ?? existing.end;
  const nextEmployeeId = data.employeeId ?? existing.employeeId;
  const overlap = await prisma.shift.findFirst({ where: { employeeId: nextEmployeeId, id: { not: id }, start: { lt: nextEnd }, end: { gt: nextStart } } });
  if (overlap) return res.status(409).json({ error: 'Shift overlaps with existing one' });

  const updated = await prisma.shift.update({ where: { id }, data });
  res.json(updated);
});

// Appointments
app.get('/api/appointments/my', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  const userId = req.user!.id as number;
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee) return res.json([]);
  const appts = await prisma.appointment.findMany({ where: { employeeId: employee.id }, include: { service: true } });
  res.json(appts);
});

// Team appointments (read-only view for Employee)
app.get('/api/appointments/team', auth(true), async (_req: Request & { user?: JWTPayload }, res: Response) => {
  const appts = await prisma.appointment.findMany({ include: { service: true, employee: true } });
  res.json(appts);
});

app.get('/api/appointments', auth(true, ['ADMIN']), async (_req: Request, res: Response) => {
  const appts = await prisma.appointment.findMany({ include: { service: true, employee: true } });
  res.json(appts);
});

// Create appointment (Admin can create for any employee; Employee creates for self)
app.post('/api/appointments', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  try {
    const body = req.body as Partial<z.infer<typeof appointmentSchema>> & { start: string };
    // Validate base shape for required fields
    const base = appointmentSchema.safeParse({
      employeeId: body.employeeId ?? 0,
      serviceId: body.serviceId,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      notes: body.notes,
      start: body.start,
    });
    if (!base.success) return res.status(400).json({ error: base.error.flatten() });

    // Resolve employeeId: employees can only create for self
    let employeeId = base.data.employeeId;
    if (req.user!.role === 'EMPLOYEE') {
      const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
      if (!me) return res.status(400).json({ error: 'Employee profile not found' });
      employeeId = me.id;
    }

    // Compute end from service duration
    const svc = await prisma.service.findUnique({ where: { id: base.data.serviceId } });
    if (!svc) return res.status(404).json({ error: 'Service not found' });
    const startDt = new Date(base.data.start);
    const endDt = new Date(startDt.getTime() + svc.durationMin * 60000);

    // overlap check (appointments only)
    const overlap = await prisma.appointment.findFirst({
      where: {
        employeeId,
        OR: [{ start: { lte: endDt }, end: { gte: startDt } }],
      },
    });
    if (overlap) return res.status(409).json({ error: 'Time slot not available' });

    const appt = await prisma.appointment.create({
      data: {
        employeeId,
        serviceId: base.data.serviceId,
        clientName: base.data.clientName!,
        clientEmail: base.data.clientEmail,
        clientPhone: base.data.clientPhone,
        notes: base.data.notes,
        start: startDt,
        end: endDt,
        status: 'CONFIRMED',
      },
      include: { service: true, employee: true },
    });
    res.json(appt);
  } catch (err) {
    console.error('Failed to create appointment:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update appointment status
app.put('/api/appointments/:id', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  const id = Number(req.params.id);
  const { status, start, serviceId, clientName, clientEmail, clientPhone, notes } = req.body as Partial<{
    status: AppointmentStatus; start: string; serviceId: number; clientName: string; clientEmail: string; clientPhone: string; notes: string;
  }>;
  try {
    const existing = await prisma.appointment.findUnique({ where: { id }, include: { service: true, employee: true } });
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });
    // Employees can only modify their own appointments
    if (req.user!.role === 'EMPLOYEE') {
      const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
      if (!me || me.id !== existing.employeeId) return res.status(403).json({ error: 'Forbidden' });
    }

    const data: any = {};
    if (status) {
      const up = (status as string).toUpperCase();
      if (!['PENDING', 'CONFIRMED', 'CANCELED'].includes(up)) return res.status(400).json({ error: 'Invalid status' });
      data.status = up;
    }
    if (typeof clientName === 'string') data.clientName = clientName;
    if (typeof clientEmail === 'string') data.clientEmail = clientEmail;
    if (typeof clientPhone === 'string') data.clientPhone = clientPhone;
    if (typeof notes === 'string') data.notes = notes;

    let nextServiceId = existing.serviceId;
    if (typeof serviceId === 'number') nextServiceId = serviceId;
    let nextStart = existing.start;
    if (typeof start === 'string') nextStart = new Date(start);

    // Recompute end based on possibly new service duration
    const svc = await prisma.service.findUnique({ where: { id: nextServiceId } });
    if (!svc) return res.status(404).json({ error: 'Service not found' });
    const nextEnd = new Date(new Date(nextStart).getTime() + svc.durationMin * 60000);

    // Overlap check
    const overlap = await prisma.appointment.findFirst({
      where: {
        employeeId: existing.employeeId,
        id: { not: id },
        OR: [{ start: { lte: nextEnd }, end: { gte: nextStart } }],
      },
    });
    if (overlap) return res.status(409).json({ error: 'Time slot not available' });

    data.start = nextStart;
    data.end = nextEnd;
    data.serviceId = nextServiceId;

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: { service: true, employee: true }
    });
    res.json(appointment);
  } catch (error) {
    console.error('Failed to update appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete appointment
app.delete('/api/appointments/:id', auth(true), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  
  try {
    await prisma.appointment.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// Public booking endpoint
app.post('/api/book', async (req: Request, res: Response) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { employeeId, serviceId, clientName, clientEmail, clientPhone, clientBirthday, notes, start } = parsed.data as any;
  // Require birthday for public bookings
  if (!clientBirthday) return res.status(400).json({ error: 'Birthday is required' });
  if (!clientEmail) return res.status(400).json({ error: 'Email is required' });
  if (!clientPhone) return res.status(400).json({ error: 'Phone number is required' });
  const svc = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!svc) return res.status(404).json({ error: 'Service not found' });
  const startDt = new Date(start);
  const endDt = new Date(startDt.getTime() + svc.durationMin * 60000);
  // naive overlap check
  const overlap = await prisma.appointment.findFirst({
    where: {
      employeeId,
      OR: [
        { start: { lte: endDt }, end: { gte: startDt } },
      ],
    },
  });
  if (overlap) return res.status(409).json({ error: 'Time slot not available' });
  const appt = await prisma.appointment.create({
    data: { employeeId, serviceId, clientName, clientEmail, clientPhone, clientBirthday: new Date(clientBirthday), notes, start: startDt, end: endDt },
  });
  res.json(appt);
});

// Public employees with services (for booking UI)
app.get('/api/public/employees', async (_req: Request, res: Response) => {
  const employees = await prisma.employee.findMany({
    include: { skills: { include: { service: true } } },
  });
  res.json(employees);
});

// Multer setup for avatar uploads (images only)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    const userId = (req as any).user?.id || 'anon';
    const name = `avatar_${userId}_${Date.now()}${safeExt}`;
    cb(null, name);
  },
});

function imageFileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  return cb(new Error('Only image uploads are allowed'));
}

const upload = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Employee self avatar upload
app.post('/api/me/avatar', auth(true), upload.single('avatar'), async (req: Request & { user?: JWTPayload } & { file?: Express.Multer.File }, res: Response) => {
  try {
    const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
    if (!me) return res.status(400).json({ error: 'Employee profile not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Delete previous local file if it was in our uploads folder
    if (me.photoUrl && me.photoUrl.includes('/uploads/')) {
      const prevName = me.photoUrl.split('/uploads/')[1];
      if (prevName) {
        const prevPath = path.join(UPLOAD_DIR, prevName);
        if (fs.existsSync(prevPath)) {
          try { fs.unlinkSync(prevPath); } catch {}
        }
      }
    }

    const host = req.get('host');
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const publicUrl = `${proto}://${host}/uploads/${req.file.filename}`;

    const updated = await prisma.employee.update({ where: { id: me.id }, data: { photoUrl: publicUrl } });
    res.json({ ok: true, photoUrl: updated.photoUrl });
  } catch (err: any) {
    console.error('Avatar upload failed:', err);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Remove my avatar
app.delete('/api/me/avatar', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  try {
    const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
    if (!me) return res.status(400).json({ error: 'Employee profile not found' });
    if (me.photoUrl && me.photoUrl.includes('/uploads/')) {
      const prevName = me.photoUrl.split('/uploads/')[1];
      if (prevName) {
        const prevPath = path.join(UPLOAD_DIR, prevName);
        if (fs.existsSync(prevPath)) {
          try { fs.unlinkSync(prevPath); } catch {}
        }
      }
    }
    await prisma.employee.update({ where: { id: me.id }, data: { photoUrl: null } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Remove avatar failed:', err);
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
});

// Admin: upload avatar for a specific employee
app.post('/api/employees/:id/avatar', auth(true, ['ADMIN']), upload.single('avatar'), async (req: Request & { user?: JWTPayload } & { file?: Express.Multer.File }, res: Response) => {
  try {
    const id = Number(req.params.id);
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Delete previous local file if it was in our uploads folder
    if (emp.photoUrl && emp.photoUrl.includes('/uploads/')) {
      const prevName = emp.photoUrl.split('/uploads/')[1];
      if (prevName) {
        const prevPath = path.join(UPLOAD_DIR, prevName);
        if (fs.existsSync(prevPath)) {
          try { fs.unlinkSync(prevPath); } catch {}
        }
      }
    }

    const host = req.get('host');
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const publicUrl = `${proto}://${host}/uploads/${req.file.filename}`;
    const updated = await prisma.employee.update({ where: { id }, data: { photoUrl: publicUrl } });
    res.json({ ok: true, photoUrl: updated.photoUrl });
  } catch (err) {
    console.error('Admin avatar upload failed:', err);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Admin: remove avatar for a specific employee
app.delete('/api/employees/:id/avatar', auth(true, ['ADMIN']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (emp.photoUrl && emp.photoUrl.includes('/uploads/')) {
      const prevName = emp.photoUrl.split('/uploads/')[1];
      if (prevName) {
        const prevPath = path.join(UPLOAD_DIR, prevName);
        if (fs.existsSync(prevPath)) {
          try { fs.unlinkSync(prevPath); } catch {}
        }
      }
    }
    await prisma.employee.update({ where: { id }, data: { photoUrl: null } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin remove avatar failed:', err);
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
});

// Seed admin if missing
async function ensureSeed() {
  const email = process.env.ADMIN_EMAIL || 'admin@salon.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({ data: { email, password: hash, role: 'ADMIN' } });
    await prisma.employee.create({ data: { userId: admin.id, firstName: 'Admin', lastName: 'User' } });
  }

  // Ensure system category and some block services exist
  let systemCat = await prisma.serviceCategory.findUnique({ where: { name: 'System' } });
  if (!systemCat) {
    systemCat = await prisma.serviceCategory.create({ data: { name: 'System', desc: 'System utilities (non-bookable by clients)' } });
  }
  const blockServices = [
    { name: 'Time Block 30', durationMin: 30 },
    { name: 'Time Block 60', durationMin: 60 },
    { name: 'Time Block 90', durationMin: 90 },
  ];
  for (const cfg of blockServices) {
    const found = await prisma.service.findFirst({ where: { name: cfg.name, categoryId: systemCat.id } });
    if (!found) {
      await prisma.service.create({ data: { name: cfg.name, categoryId: systemCat.id, priceCents: 0, durationMin: cfg.durationMin, description: 'Staff time block' } });
    }
  }
}

// My shifts endpoints (employee self-management)
app.get('/api/shifts/my', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
  if (!me) return res.json([]);
  const shifts = await prisma.shift.findMany({ where: { employeeId: me.id } });
  res.json(shifts);
});

app.post('/api/shifts/my', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
  if (!me) return res.status(400).json({ error: 'Employee profile not found' });
  const parsed = shiftSchema.safeParse({ ...req.body, employeeId: me.id });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { start, end } = parsed.data;
  if (new Date(end) <= new Date(start)) return res.status(400).json({ error: 'Shift end must be after start' });
  const overlap = await prisma.shift.findFirst({ where: { employeeId: me.id, start: { lt: new Date(end) }, end: { gt: new Date(start) } } });
  if (overlap) return res.status(409).json({ error: 'Shift overlaps with existing one' });
  const shift = await prisma.shift.create({ data: { employeeId: me.id, start: new Date(start), end: new Date(end) } });
  res.json(shift);
});

// Bulk create my shifts (Employee)
const bulkMyShiftsSchema = z.object({
  startDate: z.string(),
  weeks: z.number().int().min(1).max(26),
  weekTemplate: z.array(dayTemplateSchema).min(1)
});

app.post('/api/shifts/my/bulk', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
  if (!me) return res.status(400).json({ error: 'Employee profile not found' });
  const parsed = bulkMyShiftsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { startDate, weeks, weekTemplate } = parsed.data;

  const start = new Date(startDate + 'T00:00:00');
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const firstMonday = new Date(start);
  firstMonday.setDate(start.getDate() + diffToMonday);

  const created: any[] = [];
  let skipped = 0;
  for (let w = 0; w < weeks; w++) {
    const weekBase = new Date(firstMonday);
    weekBase.setDate(firstMonday.getDate() + w * 7);
    for (const tpl of weekTemplate) {
      const dayIdx = tpl.day;
      const date = new Date(weekBase);
      date.setDate(weekBase.getDate() + (dayIdx - 1));

      const [sh, sm] = tpl.startTime.split(':').map((s) => Number(s));
      const [eh, em] = tpl.endTime.split(':').map((s) => Number(s));
      const startDt = new Date(date); startDt.setHours(sh, sm || 0, 0, 0);
      const endDt = new Date(date); endDt.setHours(eh, em || 0, 0, 0);
      if (endDt <= startDt) { skipped++; continue; }
      const exists = await prisma.shift.findFirst({ where: { employeeId: me.id, start: { lt: endDt }, end: { gt: startDt } } });
      if (exists) { skipped++; continue; }
      const s = await prisma.shift.create({ data: { employeeId: me.id, start: startDt, end: endDt } });
      created.push(s);
    }
  }
  res.json({ ok: true, count: created.length, skipped, shifts: created });
});

// Current employee profile and services
app.get('/api/me/employee', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
  if (!me) return res.status(404).json({ error: 'Employee profile not found' });
  res.json(me);
});

app.get('/api/my/services', auth(true), async (req: Request & { user?: JWTPayload }, res: Response) => {
  const me = await prisma.employee.findUnique({ where: { userId: req.user!.id } });
  if (!me) return res.status(404).json({ error: 'Employee profile not found' });
  const skills = await prisma.employeeSkill.findMany({ where: { employeeId: me.id }, include: { service: true } });
  res.json(skills.map((s: any) => s.service));
});

app.listen(PORT, async () => {
  await ensureSeed();
  console.log(`Salon Booking API listening on http://localhost:${PORT}`);
});
