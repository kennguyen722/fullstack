import { Router } from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth.js";

const router = Router();

router.get("/public", async (_req, res) => {
  const services = await prisma.service.findMany();
  res.json(services);
});

router.use(authRequired);

router.get("/", async (_req, res) => {
  const services = await prisma.service.findMany();
  res.json(services);
});

router.post("/", async (req, res) => {
  const { name, description, duration, price } = req.body;
  const service = await prisma.service.create({ data: { name, description, duration, price } });
  res.json(service);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, duration, price } = req.body;
  const service = await prisma.service.update({ where: { id }, data: { name, description, duration, price } });
  res.json(service);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.service.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
