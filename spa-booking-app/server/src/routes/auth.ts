import { Router } from "express";
import { prisma } from "../prisma.js";
import { sign } from "../auth.js";
import bcrypt from "bcryptjs";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: "Missing fields" });
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { email, password: hash, name } });
    const token = sign({ id: user.id, email: user.email, name: user.name, role: user.role });
    res.json({ token, user });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = sign({ id: user.id, email: user.email, name: user.name, role: user.role });
  res.json({ token, user });
});

export default router;
