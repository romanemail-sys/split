import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.appConfig.upsert({
    where: { key: 'trackingIntervalSeconds' },
    update: {},
    create: { key: 'trackingIntervalSeconds', value: '30' },
  });
  console.log('Seeded default config: trackingIntervalSeconds=30');
}

main().finally(() => prisma.$disconnect());
