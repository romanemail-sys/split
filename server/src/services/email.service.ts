import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';
import { computeGroupBalances } from './balance.service';
import { config } from '../config';

// ── Lazy transporter (Bug #2 fix) ────────────────────────────────────────────
// Create the transporter on demand so module-load with missing SMTP config does
// not silently create a ghost relay pointed at localhost:25.
function createTransporter() {
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT ?? 587,          // Bug #4 fix: default to 587
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    connectionTimeout: 10_000,              // fail fast — don't hang the HTTP request
    socketTimeout: 10_000,
  });
}

// ── HTML safety (Bug #6 fix) ─────────────────────────────────────────────────
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${config.CLIENT_URL}/verify-email?token=${token}`;
  await createTransporter().sendMail({
    from: config.EMAIL_FROM,
    to,
    subject: 'אמת את כתובת האימייל שלך',
    html: `<p>לחץ <a href="${url}">כאן</a> לאימות חשבונך.</p><p>הקישור תקף ל-24 שעות.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${config.CLIENT_URL}/reset-password?token=${token}`;
  await createTransporter().sendMail({
    from: config.EMAIL_FROM,
    to,
    subject: 'איפוס סיסמה',
    html: `<p>לחץ <a href="${url}">כאן</a> לאיפוס סיסמתך.</p><p>הקישור תקף ל-1 שעה.</p>`,
  });
}

// ── Daily balance report ───────────────────────────────────────────────────

function balanceReportHtml(
  userName: string,
  groups: { groupName: string; groupId: string; items: { label: string; amount: number; currency: string; type: 'owe' | 'owed' }[] }[]
): string {
  const appUrl = config.CLIENT_URL;
  const groupRows = groups
    .map((g) => {
      const rows = g.items
        .map((item) => {
          const color = item.type === 'owe' ? '#dc2626' : '#16a34a';
          const sign = item.type === 'owe' ? '−' : '+';
          return `
          <tr>
            <td style="padding:8px 12px;font-size:14px;color:#374151;">${esc(item.label)}</td>
            <td style="padding:8px 12px;font-size:14px;font-weight:600;color:${color};text-align:right;">${sign} ${item.amount.toFixed(2)} ${esc(item.currency)}</td>
          </tr>`;
        })
        .join('');

      return `
      <div style="margin-bottom:24px;">
        <a href="${appUrl}/#/groups/${g.groupId}" style="text-decoration:none;">
          <h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:#1e293b;">${esc(g.groupName)}</h3>
        </a>
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;">
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Daily Balance Summary</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">💰 Split – Daily Summary</h1>
      <p style="margin:6px 0 0;font-size:14px;color:#bfdbfe;">Good morning, ${esc(userName)}!</p>
    </div>
    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Here's your balance snapshot across all groups:</p>
      ${groupRows}
      <div style="margin-top:24px;text-align:center;">
        <a href="${appUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Open Split</a>
      </div>
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;background:#f8fafc;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">You're receiving this because you have active balances in Split.</p>
    </div>
  </div>
</body>
</html>`;
}

/** Send daily balance summary to every user who has at least one non-zero balance. */
export async function sendDailyBalanceReports(): Promise<{ sent: number; errors: number; skipped?: number; reason?: string }> {
  // Bug #1 fix: guard all four required SMTP fields, not just two
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS || !config.EMAIL_FROM) {
    console.log('[cron] SMTP not fully configured — skipping daily report');
    return { sent: 0, errors: 0, reason: 'SMTP_NOT_CONFIGURED' };
  }

  // Fetch all non-frozen groups with their members
  const groups = await prisma.group.findMany({
    where: { frozen: false },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });

  // Build per-user balance summary across all groups
  const userBalances = new Map<
    string,
    { name: string; email: string; groups: { groupName: string; groupId: string; items: { label: string; amount: number; currency: string; type: 'owe' | 'owed' }[] }[] }
  >();

  for (const group of groups) {
    let balances: Awaited<ReturnType<typeof computeGroupBalances>>;
    try {
      balances = await computeGroupBalances(group.id);
    } catch {
      continue;
    }

    for (const member of group.members) {
      const uid = member.user.id;

      // Find all balance pairs involving this user
      const relevant = balances.filter(
        (b) => b.fromUserId === uid || b.toUserId === uid
      );
      if (relevant.length === 0) continue;

      if (!userBalances.has(uid)) {
        userBalances.set(uid, { name: member.user.name, email: member.user.email, groups: [] });
      }

      const items = relevant.map((b) => {
        if (b.fromUserId === uid) {
          // This user owes b.toName
          return { label: `You owe ${b.toName}`, amount: b.amount, currency: b.currency, type: 'owe' as const };
        } else {
          // b.fromName owes this user
          return { label: `${b.fromName} owes you`, amount: b.amount, currency: b.currency, type: 'owed' as const };
        }
      });

      userBalances.get(uid)!.groups.push({ groupName: group.name, groupId: group.id, items });
    }
  }

  const eligible = [...userBalances.values()];

  if (eligible.length === 0) {
    console.log('[cron] No users with open balances — nothing to send');
    return { sent: 0, errors: 0, skipped: 0, reason: 'NO_OPEN_BALANCES' };
  }

  // Bug #2 fix: create transporter here (after SMTP guard), not at module load
  const transporter = createTransporter();

  let sent = 0;
  let errors = 0;
  for (const userData of eligible) {
    try {
      await transporter.sendMail({
        from: config.EMAIL_FROM,
        to: userData.email,
        subject: '💰 Split – Your daily balance summary',
        html: balanceReportHtml(userData.name, userData.groups),
      });
      sent++;
    } catch (err) {
      console.error(`[cron] Failed to send balance report to ${userData.email}:`, err);
      errors++;
    }
  }

  console.log(`[cron] Daily balance report: ${sent} sent, ${errors} errors`);
  return { sent, errors };
}
