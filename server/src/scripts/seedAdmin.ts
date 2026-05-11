import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'roman.p@split.local';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash('Romari0s', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Roman P',
      email,
      passwordHash,
      isAdmin: true,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`Admin user created: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
