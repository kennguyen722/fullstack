require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
(async ()=>{
  const prisma = new PrismaClient();
  try {
    const email = process.env.SUPERADMIN_LOGIN || 'superadmin@local';
    const u = await prisma.user.findUnique({ where: { email } });
    console.log('USER:', u);
    if (u) {
      const token = jwt.sign({ id: u.id, role: u.role, businessId: u.businessId }, process.env.JWT_SECRET || 'change_me', { expiresIn: '7d' });
      console.log('TOKEN:', token);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
