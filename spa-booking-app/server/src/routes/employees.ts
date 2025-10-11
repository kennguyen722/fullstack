import { Router } from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

router.get("/", async (_req, res) => {
  const employees = await prisma.employee.findMany({ include: { services: true } });
  res.json(employees);
});

router.post("/", async (req, res) => {
  const { name, email, phone, bio, serviceIds } = req.body;
  const employee = await prisma.employee.create({
    data: {
      name, email, phone, bio,
      services: serviceIds?.length ? { connect: serviceIds.map((id: number) => ({ id })) } : undefined
    },
    include: { services: true }
  });
  res.json(employee);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, phone, bio, serviceIds } = req.body;
  const employee = await prisma.employee.update({
    where: { id }, data: {
      name, email, phone, bio,
      services: serviceIds ? {
        set: [],
        connect: serviceIds.map((sid: number) => ({ id: sid }))
      } : undefined
    }, include: { services: true }
  });
  res.json(employee);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.employee.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
