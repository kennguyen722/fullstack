import { prisma } from "./prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@spa.local" },
    update: {},
    create: {
      email: "admin@spa.local",
      password: await bcrypt.hash("password", 10),
      name: "Admin",
      role: "ADMIN",
    }
  });

  const svc1 = await prisma.service.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Classic Facial", description: "Relaxing facial treatment", duration: 60, price: 8000 }
  });
  const svc2 = await prisma.service.upsert({
    where: { id: 2 },
    update: {},
    create: { name: "Eyelash Extension", description: "Beautiful lash extension", duration: 90, price: 12000 }
  });

  const emp1 = await prisma.employee.upsert({
    where: { email: "jane@spa.local" },
    update: {},
    create: { name: "Jane Doe", email: "jane@spa.local", phone: "555-0101", bio: "Senior esthetician" }
  });
  const emp2 = await prisma.employee.upsert({
    where: { email: "amy@spa.local" },
    update: {},
    create: { name: "Amy Smith", email: "amy@spa.local", phone: "555-0102", bio: "Lash specialist" }
  });

  await prisma.employee.update({
    where: { id: emp1.id },
    data: { services: { connect: [{ id: svc1.id }] } }
  });
  await prisma.employee.update({
    where: { id: emp2.id },
    data: { services: { connect: [{ id: svc1.id }, { id: svc2.id }] } }
  });

  console.log("Seeded:", { admin, services: [svc1, svc2], employees: [emp1, emp2] });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
