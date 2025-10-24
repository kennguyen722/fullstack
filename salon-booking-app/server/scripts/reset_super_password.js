// Resets or creates a SUPER user with a known password for local testing.
// Run: node scripts/reset_super_password.js

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const email = process.env.SUPERADMIN_LOGIN || process.env.SUPERADMIN_EMAIL || 'super@salon.local';
  const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    const hash = await bcrypt.hash(password, 10);
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { password: hash, role: 'SUPER' } });
      console.log('Updated SUPER user password for', email);
    } else {
      const u = await prisma.user.create({ data: { email, password: hash, role: 'SUPER' } });
      console.log('Created SUPER user', email, 'id=', u.id);
    }
  } catch (e) {
    console.error('Failed to reset/create SUPER user:', e);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main();
