import { Router } from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth.js";
import { emitEvent } from "../socket.js";
import { sendMail } from "../mailer.js";

const router = Router();

// Public create (client booking)
router.post("/public", async (req, res) => {
  const { clientName, clientEmail, clientPhone, serviceId, employeeId, startTime, notes } = req.body;
  if (!clientName || !clientEmail || !serviceId || !employeeId || !startTime) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
  if (!service) return res.status(400).json({ error: "Unknown service" });
  const start = new Date(startTime);
  const end = new Date(start.getTime() + service.duration * 60000);
  const appt = await prisma.appointment.create({
    data: { clientName, clientEmail, clientPhone, serviceId: Number(serviceId), employeeId: Number(employeeId), startTime: start, endTime: end, notes }
  });
  // Notify admin/staff
  emitEvent("appointment:new", appt);
  try {
    await sendMail(clientEmail, "Your Appointment Request", `<p>Hi ${clientName}, we received your request for ${service.name} on ${start.toLocaleString()}.</p>`);
  } catch (e) { console.error(e); }
  res.json(appt);
});

// Protected admin/staff routes
router.use(authRequired);

router.get("/", async (_req, res) => {
  const appts = await prisma.appointment.findMany({ include: { service: true, employee: true }, orderBy: { startTime: "desc" } });
  res.json(appts);
});

router.put("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: "PENDING"|"CONFIRMED"|"CANCELLED" };
  const appt = await prisma.appointment.update({ where: { id }, data: { status } });
  emitEvent("appointment:update", appt);
  res.json(appt);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.appointment.delete({ where: { id } });
  emitEvent("appointment:delete", { id });
  res.json({ ok: true });
});

export default router;
