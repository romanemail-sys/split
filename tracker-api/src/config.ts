import 'dotenv/config';

export const config = {
  databaseUrl: process.env.DATABASE_URL!,
  adminToken: process.env.ADMIN_TOKEN ?? 'dev-admin-token',
  port: parseInt(process.env.PORT ?? '4000', 10),
};

if (!config.databaseUrl) throw new Error('DATABASE_URL is required');
