import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const categories = [
  { name: 'אוכל ומסעדות', icon: '🍕', color: '#f59e0b' },
  { name: 'תחבורה', icon: '🚗', color: '#3b82f6' },
  { name: 'בילויים', icon: '🎬', color: '#a855f7' },
  { name: 'מגורים', icon: '🏠', color: '#10b981' },
  { name: 'קניות', icon: '🛍️', color: '#f43f5e' },
  { name: 'טיולים', icon: '✈️', color: '#06b6d4' },
  { name: 'בריאות', icon: '💊', color: '#84cc16' },
  { name: 'כללי', icon: '📦', color: '#64748b' },
];

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { ...cat, isDefault: true },
    });
  }
  console.log('Seeded categories');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
