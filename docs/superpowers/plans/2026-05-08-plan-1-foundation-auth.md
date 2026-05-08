# Foundation & Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the full monorepo skeleton (client + server + shared), Prisma schema with all tables, Express server, React app with routing, and complete authentication (email/password + Google OAuth + JWT).

**Architecture:** Monorepo with three packages: `client/` (React+Vite), `server/` (Express+TypeScript), `shared/` (types). The server exposes a REST API at `/api/*` with JWT auth middleware. The client uses React Query for data fetching and Zustand for auth state. All auth tokens are JWTs — short-lived access token in memory, long-lived refresh token in httpOnly cookie.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, React Router v6, React Query v5, Zustand, Axios / Express, Prisma, PostgreSQL, bcrypt, jsonwebtoken, Passport.js (Google OAuth), Nodemailer, Zod

---

## File Map

```
split/
├── package.json                          # root workspace config
├── .gitignore
├── shared/
│   ├── package.json
│   └── src/
│       ├── types/user.ts                 # User type
│       └── types/auth.ts                 # Auth request/response types
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma                 # Full DB schema (all tables)
│   └── src/
│       ├── index.ts                      # HTTP server entrypoint
│       ├── app.ts                        # Express app setup + middleware
│       ├── config.ts                     # Env var parsing with Zod
│       ├── middleware/
│       │   ├── auth.ts                   # JWT validation middleware
│       │   └── validate.ts               # Zod request validation middleware
│       ├── routes/
│       │   └── auth.ts                   # POST /register, /login, /logout, /refresh, /forgot-password, /reset-password, GET /verify-email, /google, /google/callback
│       └── services/
│           ├── auth.service.ts           # register, login, refreshToken, resetPassword, verifyEmail
│           ├── token.service.ts          # generateAccessToken, generateRefreshToken, verifyToken
│           └── email.service.ts          # sendVerificationEmail, sendPasswordResetEmail
└── client/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                       # Router + QueryClientProvider + route definitions
        ├── lib/
        │   ├── api.ts                    # Axios instance with interceptors (token refresh)
        │   └── queryClient.ts            # React Query client config
        ├── stores/
        │   └── auth.store.ts             # Zustand: user, accessToken, setUser, logout
        ├── hooks/
        │   └── useAuth.ts                # useLogin, useRegister, useLogout, useMe
        ├── components/
        │   ├── ProtectedRoute.tsx        # Redirects unauthenticated users to /login
        │   └── layout/
        │       ├── AppLayout.tsx         # Sidebar + main content wrapper
        │       └── Sidebar.tsx           # Nav links + group list placeholder
        └── pages/
            ├── auth/
            │   ├── LoginPage.tsx
            │   ├── RegisterPage.tsx
            │   └── ForgotPasswordPage.tsx
            └── DashboardPage.tsx         # Placeholder "Hello {name}" page
```

---

## Task 1: Root Workspace Setup

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `shared/package.json`
- Create: `shared/src/types/user.ts`
- Create: `shared/src/types/auth.ts`

- [ ] **Step 1: Create root package.json with npm workspaces**

```json
{
  "name": "split",
  "private": true,
  "workspaces": ["client", "server", "shared"],
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=server\" \"npm run dev --workspace=client\"",
    "build": "npm run build --workspace=shared && npm run build --workspace=server && npm run build --workspace=client"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
build/
.env
.env.local
*.local
.superpowers/
```

- [ ] **Step 3: Create shared/package.json**

```json
{
  "name": "@split/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

- [ ] **Step 4: Create shared/src/types/user.ts**

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  defaultCurrency: string;
  createdAt: string;
}
```

- [ ] **Step 5: Create shared/src/types/auth.ts**

```typescript
import { User } from './user';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}
```

- [ ] **Step 6: Create shared/src/index.ts**

```typescript
export * from './types/user';
export * from './types/auth';
```

- [ ] **Step 7: Install root devDependencies and verify workspaces**

```bash
npm install
```

Expected: `node_modules/` created at root, no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json .gitignore shared/
git commit -m "feat: add root workspace and shared types"
```

---

## Task 2: Server Project Setup

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`
- Create: `server/src/config.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "@split/server",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@split/shared": "*",
    "@prisma/client": "^5.14.0",
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.13",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/nodemailer": "^6.4.15",
    "@types/passport": "^1.0.16",
    "@types/passport-google-oauth20": "^2.0.14",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.14.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.4",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "paths": {
      "@split/shared": ["../shared/src/index.ts"]
    }
  },
  "include": ["src/**/*", "prisma/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create server/.env.example**

```
DATABASE_URL="postgresql://user:password@localhost:5432/split"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="change-me-access"
JWT_REFRESH_SECRET="change-me-refresh"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="noreply@split.app"
CLIENT_URL="http://localhost:5173"
PORT=3001
NODE_ENV="development"
```

- [ ] **Step 4: Copy .env.example to .env and fill in your local values**

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your local PostgreSQL connection string.

- [ ] **Step 5: Create server/src/config.ts**

```typescript
import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  EMAIL_FROM: z.string(),
  CLIENT_URL: z.string(),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const config = configSchema.parse(process.env);
```

- [ ] **Step 6: Create server/src/app.ts**

```typescript
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import authRouter from './routes/auth';

const app = express();

app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
```

- [ ] **Step 7: Create server/src/index.ts**

```typescript
import 'dotenv/config';
import app from './app';
import { config } from './config';

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});
```

- [ ] **Step 8: Install server dependencies**

```bash
npm install --workspace=server
```

- [ ] **Step 9: Commit**

```bash
git add server/
git commit -m "feat: server project setup with Express and TypeScript"
```

---

## Task 3: Prisma Schema + Database Migration

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/prisma/seed.ts`

- [ ] **Step 1: Create server/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                   String    @id @default(uuid())
  name                 String
  email                String    @unique
  passwordHash         String?
  googleId             String?   @unique
  avatarUrl            String?
  defaultCurrency      String    @default("ILS")
  emailVerified        Boolean   @default(false)
  verifyEmailToken     String?
  resetPasswordToken   String?
  resetPasswordExpiry  DateTime?
  createdAt            DateTime  @default(now())

  groupsCreated   Group[]         @relation("GroupCreator")
  groupMembers    GroupMember[]
  expensesPaid    Expense[]       @relation("ExpensePaidBy")
  expenseSplits   ExpenseSplit[]
  settlementsFrom Settlement[]    @relation("SettlementFrom")
  settlementsTo   Settlement[]    @relation("SettlementTo")
  notifications   Notification[]
}

model Group {
  id              String    @id @default(uuid())
  name            String
  description     String?
  imageUrl        String?
  defaultCurrency String    @default("ILS")
  createdById     String
  createdAt       DateTime  @default(now())

  createdBy       User          @relation("GroupCreator", fields: [createdById], references: [id])
  members         GroupMember[]
  expenses        Expense[]
  settlements     Settlement[]
}

model GroupMember {
  id        String   @id @default(uuid())
  groupId   String
  userId    String
  role      GroupRole @default(MEMBER)
  joinedAt  DateTime  @default(now())

  group     Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
}

enum GroupRole {
  ADMIN
  MEMBER
}

model Category {
  id        String    @id @default(uuid())
  name      String    @unique
  icon      String
  color     String
  isDefault Boolean   @default(false)

  expenses  Expense[]
}

model Expense {
  id             String      @id @default(uuid())
  groupId        String
  paidById       String
  description    String
  amount         Decimal     @db.Decimal(12, 2)
  currency       String
  amountBase     Decimal     @db.Decimal(12, 2)
  baseCurrency   String
  categoryId     String?
  splitType      SplitType
  date           DateTime    @db.Date
  receiptUrl     String?
  isRecurring    Boolean     @default(false)
  recurrenceRule String?
  createdAt      DateTime    @default(now())

  group          Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy         User           @relation("ExpensePaidBy", fields: [paidById], references: [id])
  category       Category?      @relation(fields: [categoryId], references: [id])
  splits         ExpenseSplit[]
}

enum SplitType {
  EQUAL
  EXACT
  PERCENTAGE
  SHARES
}

model ExpenseSplit {
  id         String    @id @default(uuid())
  expenseId  String
  userId     String
  amount     Decimal   @db.Decimal(12, 2)
  isSettled  Boolean   @default(false)
  settledAt  DateTime?

  expense    Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Settlement {
  id         String   @id @default(uuid())
  groupId    String
  fromUserId String
  toUserId   String
  amount     Decimal  @db.Decimal(12, 2)
  currency   String
  note       String?
  createdAt  DateTime @default(now())

  group      Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  fromUser   User  @relation("SettlementFrom", fields: [fromUserId], references: [id])
  toUser     User  @relation("SettlementTo", fields: [toUserId], references: [id])
}

model Notification {
  id        String           @id @default(uuid())
  userId    String
  type      NotificationType
  title     String
  body      String
  link      String?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum NotificationType {
  EXPENSE_ADDED
  EXPENSE_SETTLED
  GROUP_INVITE
  PAYMENT_RECEIVED
}

model CurrencyRate {
  id           String   @id @default(uuid())
  fromCurrency String
  toCurrency   String
  rate         Decimal  @db.Decimal(12, 6)
  fetchedAt    DateTime @default(now())

  @@unique([fromCurrency, toCurrency])
}
```

- [ ] **Step 2: Run initial migration**

```bash
cd server && npx prisma migrate dev --name init
```

Expected output: `✓ Generated Prisma Client` and migration file created in `server/prisma/migrations/`.

- [ ] **Step 3: Create server/prisma/seed.ts (default categories)**

```typescript
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

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Run seed**

```bash
cd server && npm run db:seed
```

Expected: `Seeded categories`

- [ ] **Step 5: Commit**

```bash
git add server/prisma/
git commit -m "feat: add Prisma schema and seed default categories"
```

---

## Task 4: Token & Email Services

**Files:**
- Create: `server/src/services/token.service.ts`
- Create: `server/src/services/email.service.ts`
- Create: `server/src/services/__tests__/token.service.test.ts`

- [ ] **Step 1: Write failing test for token service**

Create `server/src/services/__tests__/token.service.test.ts`:

```typescript
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../token.service';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';

describe('token.service', () => {
  const userId = 'user-123';

  it('generateAccessToken returns a string', () => {
    const token = generateAccessToken(userId);
    expect(typeof token).toBe('string');
  });

  it('verifyAccessToken returns userId from valid token', () => {
    const token = generateAccessToken(userId);
    const result = verifyAccessToken(token);
    expect(result.userId).toBe(userId);
  });

  it('verifyAccessToken throws on invalid token', () => {
    expect(() => verifyAccessToken('bad-token')).toThrow();
  });

  it('generateRefreshToken returns a string', () => {
    const token = generateRefreshToken(userId);
    expect(typeof token).toBe('string');
  });

  it('verifyRefreshToken returns userId from valid token', () => {
    const token = generateRefreshToken(userId);
    const result = verifyRefreshToken(token);
    expect(result.userId).toBe(userId);
  });
});
```

- [ ] **Step 2: Add jest config to server/package.json**

Add this to `server/package.json` (inside the root object):

```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "moduleNameMapper": {
    "@split/shared": "<rootDir>/../../shared/src/index.ts"
  }
}
```

- [ ] **Step 3: Run the test — verify it fails**

```bash
npm run test --workspace=server -- --testPathPattern=token.service
```

Expected: FAIL — `Cannot find module '../token.service'`

- [ ] **Step 4: Create server/src/services/token.service.ts**

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface TokenPayload {
  userId: string;
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npm run test --workspace=server -- --testPathPattern=token.service
```

Expected: PASS (5 tests)

- [ ] **Step 6: Create server/src/services/email.service.ts**

```typescript
import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
});

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${config.CLIENT_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: config.EMAIL_FROM,
    to,
    subject: 'אמת את כתובת האימייל שלך',
    html: `<p>לחץ <a href="${url}">כאן</a> לאימות חשבונך.</p><p>הקישור תקף ל-24 שעות.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${config.CLIENT_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: config.EMAIL_FROM,
    to,
    subject: 'איפוס סיסמה',
    html: `<p>לחץ <a href="${url}">כאן</a> לאיפוס סיסמתך.</p><p>הקישור תקף ל-1 שעה.</p>`,
  });
}
```

- [ ] **Step 7: Commit**

```bash
git add server/src/services/
git commit -m "feat: add token and email services with tests"
```

---

## Task 5: Auth Middleware + Validation Middleware

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/validate.ts`

- [ ] **Step 1: Create server/src/middleware/auth.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    return;
  }
  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
  }
}
```

- [ ] **Step 2: Create server/src/middleware/validate.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: err.errors,
          },
        });
        return;
      }
      next(err);
    }
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/
git commit -m "feat: add auth and validation middleware"
```

---

## Task 6: Auth Service

**Files:**
- Create: `server/src/services/auth.service.ts`
- Create: `server/src/services/__tests__/auth.service.test.ts`

- [ ] **Step 1: Write failing tests for auth service**

Create `server/src/services/__tests__/auth.service.test.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { register, login } from '../auth.service';

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.split' } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.split' } } });
  await prisma.$disconnect();
});

describe('auth.service', () => {
  describe('register', () => {
    it('creates a user and returns user + tokens', async () => {
      const result = await register({
        name: 'Test User',
        email: 'test1@test.split',
        password: 'password123',
      });
      expect(result.user.email).toBe('test1@test.split');
      expect(result.user.name).toBe('Test User');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('throws if email already registered', async () => {
      await register({ name: 'A', email: 'test2@test.split', password: 'pass' });
      await expect(
        register({ name: 'B', email: 'test2@test.split', password: 'pass' })
      ).rejects.toThrow('EMAIL_IN_USE');
    });
  });

  describe('login', () => {
    it('returns user + tokens for valid credentials', async () => {
      await register({ name: 'C', email: 'test3@test.split', password: 'mypassword' });
      const result = await login({ email: 'test3@test.split', password: 'mypassword' });
      expect(result.user.email).toBe('test3@test.split');
    });

    it('throws for wrong password', async () => {
      await register({ name: 'D', email: 'test4@test.split', password: 'correct' });
      await expect(
        login({ email: 'test4@test.split', password: 'wrong' })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('throws for unknown email', async () => {
      await expect(
        login({ email: 'nobody@test.split', password: 'any' })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test --workspace=server -- --testPathPattern=auth.service
```

Expected: FAIL — `Cannot find module '../auth.service'`

- [ ] **Step 3: Create server/src/services/auth.service.ts**

```typescript
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { RegisterRequest, LoginRequest, AuthResponse } from '@split/shared';
import { generateAccessToken, generateRefreshToken } from './token.service';

const prisma = new PrismaClient();

function toUserDTO(user: { id: string; name: string; email: string; avatarUrl: string | null; defaultCurrency: string; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    defaultCurrency: user.defaultCurrency,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function register(data: RegisterRequest): Promise<AuthResponse & { refreshToken: string }> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error('EMAIL_IN_USE');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  return { user: toUserDTO(user), accessToken, refreshToken };
}

export async function login(data: LoginRequest): Promise<AuthResponse & { refreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.passwordHash) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  return { user: toUserDTO(user), accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  const { verifyRefreshToken } = await import('./token.service');
  const payload = verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new Error('USER_NOT_FOUND');
  return { accessToken: generateAccessToken(user.id) };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return toUserDTO(user);
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm run test --workspace=server -- --testPathPattern=auth.service
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/services/auth.service.ts server/src/services/__tests__/auth.service.test.ts
git commit -m "feat: add auth service with register/login and tests"
```

---

## Task 7: Auth Routes

**Files:**
- Create: `server/src/routes/auth.ts`
- Create: `server/src/routes/__tests__/auth.routes.test.ts`

- [ ] **Step 1: Write failing integration test**

Create `server/src/routes/__tests__/auth.routes.test.ts`:

```typescript
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@routetest.split' } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@routetest.split' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('returns 201 with user and accessToken', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Route User',
      email: 'user1@routetest.split',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('user1@routetest.split');
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'A', email: 'user2@routetest.split', password: 'pass',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'B', email: 'user2@routetest.split', password: 'pass',
    });
    expect(res.status).toBe(409);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 with user and accessToken', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User', email: 'user3@routetest.split', password: 'mypassword',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'user3@routetest.split', password: 'mypassword',
    });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user3@routetest.split');
  });

  it('returns 401 for wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'C', email: 'user4@routetest.split', password: 'correct',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'user4@routetest.split', password: 'wrong',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns current user with valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Me User', email: 'user5@routetest.split', password: 'pass',
    });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('user5@routetest.split');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test --workspace=server -- --testPathPattern=auth.routes
```

Expected: FAIL — routes not implemented

- [ ] **Step 3: Create server/src/routes/auth.ts**

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { register, login, refreshAccessToken, getMe } from '../services/auth.service';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken, ...rest } = await register(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json(rest);
  } catch (err: any) {
    if (err.message === 'EMAIL_IN_USE') {
      res.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'Email already registered' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken, ...rest } = await login(req.body);
    setRefreshCookie(res, refreshToken);
    res.json(rest);
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ success: true });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token' } });
    return;
  }
  try {
    const result = await refreshAccessToken(token);
    res.json(result);
  } catch {
    res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' } });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getMe((req as AuthenticatedRequest).userId);
    res.json(user);
  } catch {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  }
});

export default router;
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm run test --workspace=server -- --testPathPattern=auth.routes
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/
git commit -m "feat: add auth routes (register, login, logout, refresh, me)"
```

---

## Task 8: Client Project Setup

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.ts`
- Create: `client/tailwind.config.ts`
- Create: `client/postcss.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/lib/queryClient.ts`

- [ ] **Step 1: Create client/package.json**

```json
{
  "name": "@split/client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@split/shared": "*",
    "@tanstack/react-query": "^5.40.0",
    "axios": "^1.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.3.1"
  }
}
```

- [ ] **Step 2: Create client/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@split/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
```

- [ ] **Step 3: Create client/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Create client/postcss.config.ts**

```typescript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 5: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Split</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Create client/src/lib/queryClient.ts**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});
```

- [ ] **Step 8: Create client/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 9: Create client/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }
body { margin: 0; background: #0f172a; color: #f8fafc; font-family: Inter, sans-serif; }
```

- [ ] **Step 10: Install client dependencies**

```bash
npm install --workspace=client
```

- [ ] **Step 11: Commit**

```bash
git add client/
git commit -m "feat: client project setup with React, Vite, Tailwind"
```

---

## Task 9: Axios Client + Auth Store

**Files:**
- Create: `client/src/lib/api.ts`
- Create: `client/src/stores/auth.store.ts`

- [ ] **Step 1: Create client/src/lib/api.ts**

```typescript
import axios from 'axios';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 2: Create client/src/stores/auth.store.ts**

```typescript
import { create } from 'zustand';
import { User } from '@split/shared';
import { setAccessToken } from '../lib/api';

interface AuthState {
  user: User | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setAuth: (user, token) => {
    setAccessToken(token);
    set({ user });
  },
  logout: () => {
    setAccessToken(null);
    set({ user: null });
  },
}));
```

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/api.ts client/src/stores/
git commit -m "feat: add Axios client with token interceptor and auth store"
```

---

## Task 10: Auth Hooks

**Files:**
- Create: `client/src/hooks/useAuth.ts`

- [ ] **Step 1: Create client/src/hooks/useAuth.ts**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { LoginRequest, RegisterRequest } from '@split/shared';

export function useLogin() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: (data: LoginRequest) => api.post('/auth/login', data).then((r) => r.data),
    onSuccess: (data) => setAuth(data.user, data.accessToken),
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: (data: RegisterRequest) => api.post('/auth/register', data).then((r) => r.data),
    onSuccess: (data) => setAuth(data.user, data.accessToken),
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout').then((r) => r.data),
    onSuccess: () => {
      logout();
      qc.clear();
    },
  });
}

export function useMe() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    enabled: !!user,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/
git commit -m "feat: add auth hooks (useLogin, useRegister, useLogout, useMe)"
```

---

## Task 11: Auth Pages (Login, Register, ForgotPassword)

**Files:**
- Create: `client/src/pages/auth/LoginPage.tsx`
- Create: `client/src/pages/auth/RegisterPage.tsx`
- Create: `client/src/pages/auth/ForgotPasswordPage.tsx`

- [ ] **Step 1: Create client/src/pages/auth/LoginPage.tsx**

```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      navigate('/dashboard');
    } catch {}
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm p-8 bg-slate-800 rounded-2xl">
        <h1 className="text-2xl font-bold text-center mb-2">💸 Split</h1>
        <p className="text-slate-400 text-center mb-8">התחבר לחשבונך</p>

        {login.isError && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400 text-sm">
            אימייל או סיסמה שגויים
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={login.isPending}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {login.isPending ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-600" />
          <span className="text-slate-400 text-sm">או</span>
          <div className="flex-1 h-px bg-slate-600" />
        </div>

        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-2 w-full py-2 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          המשך עם Google
        </a>

        <p className="mt-6 text-center text-slate-400 text-sm">
          אין לך חשבון?{' '}
          <Link to="/register" className="text-blue-400 hover:underline">הירשם</Link>
        </p>
        <p className="mt-2 text-center">
          <Link to="/forgot-password" className="text-slate-400 text-sm hover:underline">שכחת סיסמה?</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create client/src/pages/auth/RegisterPage.tsx**

```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../../hooks/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await register.mutateAsync({ name, email, password });
      navigate('/dashboard');
    } catch {}
  }

  const errorMsg = (() => {
    const err = register.error as any;
    if (err?.response?.data?.error?.code === 'EMAIL_IN_USE') return 'האימייל כבר רשום במערכת';
    if (register.isError) return 'שגיאה בהרשמה, נסה שוב';
    return null;
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm p-8 bg-slate-800 rounded-2xl">
        <h1 className="text-2xl font-bold text-center mb-2">💸 Split</h1>
        <p className="text-slate-400 text-center mb-8">צור חשבון חדש</p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">שם מלא</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">סיסמה (לפחות 6 תווים)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={register.isPending}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {register.isPending ? 'נרשם...' : 'הירשם'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          כבר יש לך חשבון?{' '}
          <Link to="/login" className="text-blue-400 hover:underline">התחבר</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create client/src/pages/auth/ForgotPasswordPage.tsx**

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm p-8 bg-slate-800 rounded-2xl">
        <h1 className="text-xl font-bold text-center mb-2">שחזור סיסמה</h1>

        {sent ? (
          <div className="text-center">
            <p className="text-green-400 mb-4">✓ שלחנו לך אימייל עם קישור לאיפוס</p>
            <Link to="/login" className="text-blue-400 hover:underline text-sm">חזרה להתחברות</Link>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-6">הכנס את האימייל שלך ונשלח לך קישור לאיפוס הסיסמה</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="האימייל שלך"
                required
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
              </button>
            </form>
            <p className="mt-4 text-center">
              <Link to="/login" className="text-slate-400 text-sm hover:underline">חזרה להתחברות</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/
git commit -m "feat: add login, register, and forgot-password pages"
```

---

## Task 12: App Layout + Protected Route + Router

**Files:**
- Create: `client/src/components/ProtectedRoute.tsx`
- Create: `client/src/components/layout/Sidebar.tsx`
- Create: `client/src/components/layout/AppLayout.tsx`
- Create: `client/src/pages/DashboardPage.tsx`
- Create: `client/src/App.tsx`

- [ ] **Step 1: Create client/src/components/ProtectedRoute.tsx**

```tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 2: Create client/src/components/layout/Sidebar.tsx**

```tsx
import { NavLink } from 'react-router-dom';
import { useLogout } from '../../hooks/useAuth';

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'דאשבורד' },
  { to: '/groups', icon: '👥', label: 'קבוצות' },
  { to: '/expenses', icon: '💸', label: 'הוצאות' },
  { to: '/analytics', icon: '📊', label: 'ניתוח' },
  { to: '/notifications', icon: '🔔', label: 'התראות' },
];

export default function Sidebar() {
  const logout = useLogout();

  return (
    <aside className="w-56 bg-slate-800 border-l border-slate-700 flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-slate-700">
        <span className="text-xl font-bold">💸 Split</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={() => logout.mutate()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <span>🚪</span>
          <span>התנתק</span>
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create client/src/components/layout/AppLayout.tsx**

```tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Create client/src/pages/DashboardPage.tsx**

```tsx
import { useAuthStore } from '../stores/auth.store';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">שלום, {user?.name} 👋</h1>
      <p className="text-slate-400">הדאשבורד יהיה כאן בקרוב.</p>
    </div>
  );
}
```

- [ ] **Step 5: Create client/src/App.tsx**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="groups" element={<div className="text-slate-400">Groups — Plan 2</div>} />
          <Route path="expenses" element={<div className="text-slate-400">Expenses — Plan 2</div>} />
          <Route path="analytics" element={<div className="text-slate-400">Analytics — Plan 4</div>} />
          <Route path="notifications" element={<div className="text-slate-400">Notifications — Plan 4</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/
git commit -m "feat: add app layout, protected route, and router"
```

---

## Task 13: Google OAuth on Server

**Files:**
- Modify: `server/src/app.ts`
- Create: `server/src/routes/oauth.ts`

- [ ] **Step 1: Create server/src/routes/oauth.ts**

```typescript
import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { generateAccessToken, generateRefreshToken } from '../services/token.service';

const router = Router();
const prisma = new PrismaClient();

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'));

        let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

        if (!user) {
          user = await prisma.user.findUnique({ where: { email } });
          if (user) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id, avatarUrl: user.avatarUrl ?? profile.photos?.[0]?.value },
            });
          } else {
            user = await prisma.user.create({
              data: {
                name: profile.displayName,
                email,
                googleId: profile.id,
                avatarUrl: profile.photos?.[0]?.value,
              },
            });
          }
        }

        done(null, user);
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${config.CLIENT_URL}/login?error=oauth`, session: false }),
  (req, res) => {
    const user = req.user as any;
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${config.CLIENT_URL}/auth/callback?token=${accessToken}`);
  }
);

export default router;
```

- [ ] **Step 2: Update server/src/app.ts to mount oauth router**

Replace the existing `app.ts` content:

```typescript
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { config } from './config';
import authRouter from './routes/auth';
import oauthRouter from './routes/oauth';

const app = express();

app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use('/api/auth', authRouter);
app.use('/api/auth', oauthRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
```

- [ ] **Step 3: Create client OAuth callback page**

Create `client/src/pages/auth/OAuthCallbackPage.tsx`:

```tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = params.get('token');
    if (!token) { navigate('/login'); return; }

    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        setAuth(data, token);
        navigate('/dashboard');
      })
      .catch(() => navigate('/login'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-slate-400">מתחבר...</p>
    </div>
  );
}
```

- [ ] **Step 4: Add OAuth callback route to App.tsx**

Add this import and route to `client/src/App.tsx`:

```tsx
// Add import:
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';

// Add route (outside the ProtectedRoute wrapper, alongside /login):
<Route path="/auth/callback" element={<OAuthCallbackPage />} />
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/oauth.ts server/src/app.ts client/src/pages/auth/OAuthCallbackPage.tsx client/src/App.tsx
git commit -m "feat: add Google OAuth flow"
```

---

## Task 14: Forgot Password + Reset Password + Email Verify Routes

**Files:**
- Modify: `server/src/services/auth.service.ts`
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: Add forgotPassword and resetPassword to auth.service.ts**

Append these functions to the bottom of `server/src/services/auth.service.ts`:

```typescript
import crypto from 'crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service';

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silent — don't reveal whether email exists

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordToken: token, resetPasswordExpiry: expiry },
  });

  await sendPasswordResetEmail(email, token);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpiry: { gt: new Date() },
    },
  });
  if (!user) throw new Error('INVALID_OR_EXPIRED_TOKEN');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetPasswordToken: null, resetPasswordExpiry: null },
  });
}

export async function sendEmailVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({ where: { id: userId }, data: { verifyEmailToken: token } });
  await sendVerificationEmail(user.email, token);
}

export async function verifyEmail(token: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { verifyEmailToken: token } });
  if (!user) throw new Error('INVALID_TOKEN');
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyEmailToken: null },
  });
}
```

- [ ] **Step 2: Add the missing Zod schemas and routes to server/src/routes/auth.ts**

Add these schemas before the `router.post('/register', ...)` line:

```typescript
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string(), password: z.string().min(6) });
```

Append these routes before `export default router`:

```typescript
import { forgotPassword, resetPassword, sendEmailVerification, verifyEmail } from '../services/auth.service';

router.post('/forgot-password', validate(forgotSchema), async (req: Request, res: Response) => {
  await forgotPassword(req.body.email).catch(() => {}); // silent
  res.json({ success: true });
});

router.post('/reset-password', validate(resetSchema), async (req: Request, res: Response) => {
  try {
    await resetPassword(req.body.token, req.body.password);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message === 'INVALID_OR_EXPIRED_TOKEN') {
      res.status(400).json({ error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Token invalid or expired' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

router.get('/verify-email', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) { res.status(400).json({ error: { code: 'MISSING_TOKEN', message: 'Token required' } }); return; }
  try {
    await verifyEmail(token);
    res.redirect(`${config.CLIENT_URL}/login?verified=1`);
  } catch {
    res.redirect(`${config.CLIENT_URL}/login?error=invalid_token`);
  }
});
```

- [ ] **Step 3: Add reset-password page to client**

Create `client/src/pages/auth/ResetPasswordPage.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = params.get('token') ?? '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login?reset=1');
    } catch {
      setError('הקישור לא תקף או שפג תוקפו');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm p-8 bg-slate-800 rounded-2xl">
        <h1 className="text-xl font-bold text-center mb-6">בחר סיסמה חדשה</h1>
        {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה חדשה (לפחות 6 תווים)"
            required
            minLength={6}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {loading ? 'שומר...' : 'שמור סיסמה'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add /reset-password route to App.tsx**

Add this import and route to `client/src/App.tsx` (alongside the other auth routes):

```tsx
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
// ...
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

- [ ] **Step 5: Commit**

```bash
git add server/src/services/auth.service.ts server/src/routes/auth.ts client/src/pages/auth/ResetPasswordPage.tsx client/src/App.tsx
git commit -m "feat: add forgot-password, reset-password, and email-verify endpoints"
```

---

## Task 16: Smoke Test — Run Full Stack

- [ ] **Step 1: Start the server**

```bash
npm run dev --workspace=server
```

Expected: `Server running on port 3001`

- [ ] **Step 2: Start the client (new terminal)**

```bash
npm run dev --workspace=client
```

Expected: `http://localhost:5173`

- [ ] **Step 3: Manual smoke test**

1. Open http://localhost:5173 — should redirect to `/login`
2. Click "הירשם" — fill form, submit — should land on `/dashboard` with your name
3. Click "התנתק" — should return to `/login`
4. Log back in with email/password — should work

- [ ] **Step 4: Run all server tests**

```bash
npm run test --workspace=server
```

Expected: All tests pass (≥12 tests)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Plan 1 complete — foundation, auth, and app shell"
```

---

## Summary

Plan 1 delivers:
- Full monorepo setup (`client/`, `server/`, `shared/`)
- Complete Prisma schema (all 9 tables)
- Express server with JWT auth, refresh tokens, Google OAuth
- React app with protected routing, sidebar layout
- Login, Register, Forgot Password, OAuth callback pages
- 12+ tests covering auth service and routes

**Next:** Plan 2 — Groups, Expenses, Currency
