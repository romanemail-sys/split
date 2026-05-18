import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

export const config = {
  databaseUrl,
  adminToken: process.env.ADMIN_TOKEN ?? 'dev-admin-token',
  port: parseInt(process.env.PORT ?? '4000', 10),
};
