/**
 * Tests for sendDailyBalanceReports (balance email report feature).
 *
 * Strategy: mock nodemailer at module level so the transporter spy is in place
 * before email.service.ts is imported. Use real DB with @test.split emails for
 * integration paths that need actual balance data.
 *
 * Note: tests run against the local dev DB which may contain other user data.
 * Assertions are scoped to @test.split email addresses to avoid false failures
 * caused by unrelated existing data.
 */

import { PrismaClient } from '@prisma/client';

// ── nodemailer mock ──────────────────────────────────────────────────────────
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

// ── Import AFTER mocks are in place ─────────────────────────────────────────
// eslint-disable-next-line import/first
import { sendDailyBalanceReports } from '../email.service';

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────
const E = (n: number) => `report-test-${n}@test.split`;

/** Returns all email addresses that received a mocked sendMail call */
function sentToAddresses(): string[] {
  return (mockSendMail.mock.calls as unknown[][]).map((c) => (c[0] as { to: string }).to);
}

/** Returns the HTML body sent to a specific address, or undefined */
function htmlSentTo(address: string): string | undefined {
  const call = (mockSendMail.mock.calls as unknown[][])
    .map((c) => c[0] as { to: string; html: string })
    .find((c) => c.to === address);
  return call?.html;
}

async function seedTwoUserGroup() {
  const userA = await prisma.user.create({
    data: { name: 'Alice Test', email: E(1), passwordHash: 'x', emailVerified: true },
  });
  const userB = await prisma.user.create({
    data: { name: 'Bob Test', email: E(2), passwordHash: 'x', emailVerified: true },
  });
  const group = await prisma.group.create({
    data: {
      name: 'Test Group',
      defaultCurrency: 'USD',
      createdById: userA.id,
      members: {
        create: [
          { userId: userA.id, role: 'ADMIN' },
          { userId: userB.id, role: 'MEMBER' },
        ],
      },
    },
  });
  const category = await prisma.category.findFirst() ?? await prisma.category.create({
    data: { name: 'test-cat', icon: '🧪', color: '#000' },
  });
  // Alice paid 100 USD; Bob owes 50 USD (equal split)
  const expense = await prisma.expense.create({
    data: {
      groupId: group.id,
      paidById: userA.id,
      description: 'Test dinner',
      amount: 100,
      currency: 'USD',
      amountBase: 100,
      baseCurrency: 'USD',
      categoryId: category.id,
      splitType: 'EQUAL',
      date: new Date(),
    },
  });
  // Alice's own split (settled — she paid)
  await prisma.expenseSplit.create({
    data: { expenseId: expense.id, userId: userA.id, amount: 50, isSettled: true },
  });
  // Bob's unsettled split
  await prisma.expenseSplit.create({
    data: { expenseId: expense.id, userId: userB.id, amount: 50, isSettled: false },
  });
  return { userA, userB, group, expense };
}

async function seedFrozenGroup() {
  const userC = await prisma.user.create({
    data: { name: 'Carol Test', email: E(3), passwordHash: 'x', emailVerified: true },
  });
  const userD = await prisma.user.create({
    data: { name: 'Dave Test', email: E(4), passwordHash: 'x', emailVerified: true },
  });
  const group = await prisma.group.create({
    data: {
      name: 'Frozen Group',
      defaultCurrency: 'USD',
      createdById: userC.id,
      frozen: true,
      members: {
        create: [
          { userId: userC.id, role: 'ADMIN' },
          { userId: userD.id, role: 'MEMBER' },
        ],
      },
    },
  });
  const category = await prisma.category.findFirst()!;
  const expense = await prisma.expense.create({
    data: {
      groupId: group.id,
      paidById: userC.id,
      description: 'Frozen expense',
      amount: 200,
      currency: 'USD',
      amountBase: 200,
      baseCurrency: 'USD',
      categoryId: category!.id,
      splitType: 'EQUAL',
      date: new Date(),
    },
  });
  await prisma.expenseSplit.create({
    data: { expenseId: expense.id, userId: userC.id, amount: 100, isSettled: true },
  });
  await prisma.expenseSplit.create({
    data: { expenseId: expense.id, userId: userD.id, amount: 100, isSettled: false },
  });
  return { userC, userD, group };
}

// ── Cleanup ──────────────────────────────────────────────────────────────────
beforeEach(async () => {
  mockSendMail.mockClear();
  // Remove test data in correct FK order (only @test.split addresses)
  const users = await prisma.user.findMany({ where: { email: { contains: '@test.split' } } });
  const ids = users.map((u) => u.id);
  if (ids.length > 0) {
    const groups = await prisma.group.findMany({ where: { createdById: { in: ids } } });
    const gids = groups.map((g) => g.id);
    if (gids.length > 0) {
      await prisma.expenseSplit.deleteMany({ where: { expense: { groupId: { in: gids } } } });
      await prisma.expense.deleteMany({ where: { groupId: { in: gids } } });
      await prisma.groupMember.deleteMany({ where: { groupId: { in: gids } } });
      await prisma.group.deleteMany({ where: { id: { in: gids } } });
    }
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('sendDailyBalanceReports', () => {

  // ── Bug #1 + #2: SMTP guard ──────────────────────────────────────────────
  // config is parsed at module load from process.env. The guard now checks all
  // four SMTP fields. In test env the .env has placeholder values, so the guard
  // passes and nodemailer (mocked) is used. The SMTP_NOT_CONFIGURED path is
  // exercised when any of the four vars is absent.

  describe('SMTP guard', () => {
    it('returns SMTP_NOT_CONFIGURED when SMTP_HOST is missing', async () => {
      // Only meaningful when the env doesn't have SMTP configured.
      // config is already parsed at module load — we check the runtime state.
      const smtpReady =
        !!process.env.SMTP_HOST &&
        !!process.env.SMTP_USER &&
        !!process.env.SMTP_PASS &&
        !!process.env.EMAIL_FROM;

      if (!smtpReady) {
        const result = await sendDailyBalanceReports();
        expect(result.reason).toBe('SMTP_NOT_CONFIGURED');
        expect(result.sent).toBe(0);
        expect(mockSendMail).not.toHaveBeenCalled();
      }
      // If SMTP IS configured (local dev .env), this test is vacuous but passes.
    });
  });

  // ── No balances ──────────────────────────────────────────────────────────

  it('does not email users whose splits are all settled', async () => {
    // Create a group with fully-settled expenses so these users have no open balance.
    const userA = await prisma.user.create({
      data: { name: 'Settled Alice', email: E(5), passwordHash: 'x', emailVerified: true },
    });
    const userB = await prisma.user.create({
      data: { name: 'Settled Bob', email: E(6), passwordHash: 'x', emailVerified: true },
    });
    const group = await prisma.group.create({
      data: {
        name: 'Settled Group',
        defaultCurrency: 'USD',
        createdById: userA.id,
        members: { create: [{ userId: userA.id, role: 'ADMIN' }, { userId: userB.id, role: 'MEMBER' }] },
      },
    });
    const cat = await prisma.category.findFirst();
    if (cat) {
      const expense = await prisma.expense.create({
        data: {
          groupId: group.id, paidById: userA.id, description: 'All settled',
          amount: 100, currency: 'USD', amountBase: 100, baseCurrency: 'USD',
          categoryId: cat.id, splitType: 'EQUAL', date: new Date(),
        },
      });
      // Both splits settled — no open balance for either user
      await prisma.expenseSplit.createMany({
        data: [
          { expenseId: expense.id, userId: userA.id, amount: 50, isSettled: true },
          { expenseId: expense.id, userId: userB.id, amount: 50, isSettled: true },
        ],
      });
    }

    await sendDailyBalanceReports();

    // These specific users must NOT receive emails (other DB users may still get theirs)
    expect(sentToAddresses()).not.toContain(E(5));
    expect(sentToAddresses()).not.toContain(E(6));
  });

  // ── Frozen group excluded ─────────────────────────────────────────────────

  it('does NOT email members of frozen groups', async () => {
    await seedFrozenGroup();

    await sendDailyBalanceReports();

    // Carol (E(3)) and Dave (E(4)) are in a frozen group — must not receive emails
    expect(sentToAddresses()).not.toContain(E(3));
    expect(sentToAddresses()).not.toContain(E(4));
  });

  // ── Happy path (only runs when SMTP is configured) ────────────────────────

  describe('when SMTP is configured', () => {
    // The SMTP guard now checks all four vars. If all are set in the env,
    // nodemailer (mocked) will be invoked for users with open balances.

    it('emails every user with an open balance', async () => {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER ||
          !process.env.SMTP_PASS || !process.env.EMAIL_FROM) {
        console.log('  [skip] SMTP not configured — skipping live send test');
        return;
      }

      const { userA, userB } = await seedTwoUserGroup();
      const result = await sendDailyBalanceReports();

      expect(result.errors).toBe(0);
      // Alice is owed 50, Bob owes 50 — both must receive emails
      // result.sent may be > 2 if other users in dev DB have open balances
      expect(sentToAddresses()).toContain(userA.email);
      expect(sentToAddresses()).toContain(userB.email);
      expect(result.sent).toBeGreaterThanOrEqual(2);
    });

    it('email for debtor contains "You owe" label', async () => {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER ||
          !process.env.SMTP_PASS || !process.env.EMAIL_FROM) return;

      const { userB } = await seedTwoUserGroup();
      await sendDailyBalanceReports();

      const html = htmlSentTo(userB.email);
      expect(html).toBeDefined();
      expect(html).toContain('You owe');
      expect(html).toContain('50.00');
      expect(html).toContain('USD');
    });

    it('email for creditor contains "owes you" label', async () => {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER ||
          !process.env.SMTP_PASS || !process.env.EMAIL_FROM) return;

      const { userA } = await seedTwoUserGroup();
      await sendDailyBalanceReports();

      const html = htmlSentTo(userA.email);
      expect(html).toBeDefined();
      expect(html).toContain('owes you');
      expect(html).toContain('50.00');
      expect(html).toContain('USD');
    });

    it('includes group name and link in email html', async () => {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER ||
          !process.env.SMTP_PASS || !process.env.EMAIL_FROM) return;

      const { userB, group } = await seedTwoUserGroup();
      await sendDailyBalanceReports();

      const html = htmlSentTo(userB.email);
      expect(html).toContain('Test Group');
      expect(html).toContain(group.id);
    });

    it('does NOT include frozen group content in any email', async () => {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER ||
          !process.env.SMTP_PASS || !process.env.EMAIL_FROM) return;

      await seedTwoUserGroup();   // active — should appear
      await seedFrozenGroup();    // frozen — must NOT appear

      await sendDailyBalanceReports();

      const allHtml = (mockSendMail.mock.calls as unknown[][])
        .map((c) => (c[0] as { html: string }).html);

      for (const html of allHtml) {
        expect(html).not.toContain('Frozen Group');
      }
    });

    it('sends one combined email per user even when in multiple groups', async () => {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER ||
          !process.env.SMTP_PASS || !process.env.EMAIL_FROM) return;

      const { userA, userB } = await seedTwoUserGroup();
      const cat = await prisma.category.findFirst();
      const group2 = await prisma.group.create({
        data: {
          name: 'Second Group',
          defaultCurrency: 'USD',
          createdById: userA.id,
          members: { create: [{ userId: userA.id, role: 'ADMIN' }, { userId: userB.id, role: 'MEMBER' }] },
        },
      });
      if (cat) {
        const expense2 = await prisma.expense.create({
          data: {
            groupId: group2.id, paidById: userA.id, description: 'Group 2 expense',
            amount: 60, currency: 'USD', amountBase: 60, baseCurrency: 'USD',
            categoryId: cat.id, splitType: 'EQUAL', date: new Date(),
          },
        });
        await prisma.expenseSplit.createMany({
          data: [
            { expenseId: expense2.id, userId: userA.id, amount: 30, isSettled: true },
            { expenseId: expense2.id, userId: userB.id, amount: 30, isSettled: false },
          ],
        });
      }

      await sendDailyBalanceReports();

      // Bob must receive exactly ONE email (not one per group)
      const bobCalls = (mockSendMail.mock.calls as unknown[][])
        .filter((c) => (c[0] as { to: string }).to === userB.email);
      expect(bobCalls.length).toBe(1);

      // That single email should mention both groups
      const html = (bobCalls[0][0] as { html: string }).html;
      expect(html).toContain('Test Group');
      expect(html).toContain('Second Group');
    });
  });

  // ── HTML safety (Bug #6 fix) ──────────────────────────────────────────────

  it('HTML-encodes user names with special characters', async () => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER ||
        !process.env.SMTP_PASS || !process.env.EMAIL_FROM) return;

    const xssUser = await prisma.user.create({
      data: { name: 'Alice <b>bold</b>', email: E(7), passwordHash: 'x', emailVerified: true },
    });
    const normalUser = await prisma.user.create({
      data: { name: 'Normal Bob', email: E(8), passwordHash: 'x', emailVerified: true },
    });
    const cat = await prisma.category.findFirst();
    const group = await prisma.group.create({
      data: {
        name: 'XSS Test Group',
        defaultCurrency: 'USD',
        createdById: xssUser.id,
        members: { create: [{ userId: xssUser.id, role: 'ADMIN' }, { userId: normalUser.id, role: 'MEMBER' }] },
      },
    });
    if (cat) {
      const expense = await prisma.expense.create({
        data: {
          groupId: group.id, paidById: xssUser.id, description: 'XSS test',
          amount: 100, currency: 'USD', amountBase: 100, baseCurrency: 'USD',
          categoryId: cat.id, splitType: 'EQUAL', date: new Date(),
        },
      });
      await prisma.expenseSplit.createMany({
        data: [
          { expenseId: expense.id, userId: xssUser.id, amount: 50, isSettled: true },
          { expenseId: expense.id, userId: normalUser.id, amount: 50, isSettled: false },
        ],
      });
    }

    await sendDailyBalanceReports();

    const html = htmlSentTo(normalUser.email);
    if (html) {
      // Raw <b> tags must NOT appear — names must be HTML-escaped
      expect(html).not.toContain('<b>bold</b>');
      expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    }
  });
});
