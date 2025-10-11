import 'dotenv/config';
import pkg from '@prisma/client';
import bcrypt from 'bcryptjs';

const { PrismaClient } = pkg as any;
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const rawPassword = process.env.ADMIN_PASSWORD || 'password';
  const hashed = await bcrypt.hash(rawPassword, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' as any, password: hashed },
    create: { email, password: hashed, name: 'Admin User', role: 'ADMIN' as any }
  });
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      displayName: 'Ken Nguyen',
      headline: 'Principal Software Developer',
      summary:
        'Experienced engineer with leadership background and strong technical skills.',
      photoUrl: '',
  location: 'Remote · Worldwide',
      availability: 'Open to full-time roles',
      focusAreas: 'Platform architecture · Developer experience · Applied AI',
      email: 'profileuser@email.com',
      linkedin: 'https://www.linkedin.com/in/your-profile',
      github: 'https://github.com/your-handle'
    },
    create: {
      userId: user.id,
      displayName: 'Ken Nguyen',
      headline: 'Principal Software Developer',
      summary:
        'Experienced engineer with leadership background and strong technical skills.',
      photoUrl: '',
      location: 'Remote · Worldwide',
      availability: 'Open to full-time roles',
      focusAreas: 'Platform architecture · Developer experience · Applied AI',
      email: 'hello@example.com',
      linkedin: 'https://www.linkedin.com/in/your-profile',
      github: 'https://github.com/your-handle'
    }
  });
  console.log('Seed complete');
}

main().finally(() => prisma.$disconnect());
