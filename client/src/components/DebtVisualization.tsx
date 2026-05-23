import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupBalance, GroupMember } from '@split/shared';

interface MinTx {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

// Greedy debt-minimization: compute net balance per person, then greedily match largest debtor to largest creditor
function minimizeTransactions(balances: GroupBalance[]): MinTx[] {
  const net = new Map<string, { name: string; amount: number }>();

  for (const b of balances) {
    const from = net.get(b.fromUserId) ?? { name: b.fromName, amount: 0 };
    net.set(b.fromUserId, { name: from.name, amount: from.amount - b.amount });
    const to = net.get(b.toUserId) ?? { name: b.toName, amount: 0 };
    net.set(b.toUserId, { name: to.name, amount: to.amount + b.amount });
  }

  const debtors = [...net.entries()]
    .filter(([, v]) => v.amount < -0.005)
    .map(([id, v]) => ({ id, name: v.name, amount: v.amount }))
    .sort((a, b) => a.amount - b.amount); // most negative first

  const creditors = [...net.entries()]
    .filter(([, v]) => v.amount > 0.005)
    .map(([id, v]) => ({ id, name: v.name, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount); // most positive first

  const txs: MinTx[] = [];
  let di = 0, ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di];
    const c = creditors[ci];
    const amount = Math.round(Math.min(-d.amount, c.amount) * 100) / 100;

    txs.push({ fromId: d.id, fromName: d.name, toId: c.id, toName: c.name, amount });

    d.amount += amount;
    c.amount -= amount;
    if (Math.abs(d.amount) < 0.005) di++;
    if (Math.abs(c.amount) < 0.005) ci++;
  }

  return txs;
}

// ─── SVG graph helpers ────────────────────────────────────────────────────────

const NODE_R = 28;
const W = 520;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const NODE_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444','#84cc16'];

interface NodePos { x: number; y: number; initials: string; firstName: string; color: string }

function buildPositions(ids: string[], nameMap: Map<string, string>): Map<string, NodePos> {
  const n = ids.length;
  const r = n <= 2 ? 100 : Math.min(130, (Math.min(W, H) / 2) - NODE_R - 16);
  const map = new Map<string, NodePos>();
  ids.forEach((id, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    const name = nameMap.get(id) ?? 'Unknown';
    map.set(id, {
      x: CX + r * Math.cos(angle),
      y: CY + r * Math.sin(angle),
      initials: name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase(),
      firstName: name.split(' ')[0],
      color: NODE_COLORS[i % NODE_COLORS.length],
    });
  });
  return map;
}

interface ArrowSpec { fromId: string; toId: string; amount: number; label: string }

function DebtGraph({
  arrows, positions, stroke, markerId, labelFill, nodeBg,
}: {
  arrows: ArrowSpec[];
  positions: Map<string, NodePos>;
  stroke: string;
  markerId: string;
  labelFill: string;
  nodeBg: string;
}) {
  const maxAmt = Math.max(...arrows.map((a) => a.amount), 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
      <defs>
        <marker id={markerId} markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill={stroke} />
        </marker>
      </defs>

      {/* Arrows */}
      {arrows.map(({ fromId, toId, amount, label }) => {
        const s = positions.get(fromId);
        const e = positions.get(toId);
        if (!s || !e) return null;

        const dx = e.x - s.x, dy = e.y - s.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len, uy = dy / len;
        const px = -uy, py = ux; // perpendicular

        const sx = s.x + ux * NODE_R, sy = s.y + uy * NODE_R;
        const ex = e.x - ux * (NODE_R + 6), ey = e.y - uy * (NODE_R + 6);
        const cpx = (sx + ex) / 2 + px * 44;
        const cpy = (sy + ey) / 2 + py * 44;
        // label at t≈0.5 on bezier
        const lx = 0.25 * sx + 0.5 * cpx + 0.25 * ex;
        const ly = 0.25 * sy + 0.5 * cpy + 0.25 * ey;

        const sw = 1.5 + (amount / maxAmt) * 3.5;
        const key = `${fromId}-${toId}`;

        return (
          <g key={key}>
            <path
              d={`M${sx},${sy} Q${cpx},${cpy} ${ex},${ey}`}
              fill="none"
              stroke={stroke}
              strokeWidth={sw}
              markerEnd={`url(#${markerId})`}
              opacity={0.7}
            />
            <rect x={lx - 26} y={ly - 9} width={52} height={18} rx={9} fill="white" stroke={stroke} strokeWidth={1} opacity={0.92} />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize={9.5} fill={labelFill} fontWeight="700">
              {label}
            </text>
          </g>
        );
      })}

      {/* Nodes */}
      {[...positions.entries()].map(([id, pos]) => (
        <g key={id}>
          <circle cx={pos.x} cy={pos.y} r={NODE_R} fill={nodeBg} stroke={pos.color} strokeWidth={2.5} />
          <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={13} fontWeight="800" fill={pos.color}>
            {pos.initials}
          </text>
          <text x={pos.x} y={pos.y + NODE_R + 14} textAnchor="middle" fontSize={10.5} fill="#475569" fontWeight="500">
            {pos.firstName}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  balances: GroupBalance[];
  members: GroupMember[];
  currency: string;
}

export function DebtVisualization({ balances, members, currency }: Props) {
  const { t } = useTranslation();

  const minimized = useMemo(() => minimizeTransactions(balances), [balances]);

  // Name lookup for all people mentioned
  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of balances) { m.set(b.fromUserId, b.fromName); m.set(b.toUserId, b.toName); }
    for (const gm of members) { m.set(gm.userId, gm.user.name); }
    return m;
  }, [balances, members]);

  const currentIds = useMemo(
    () => [...new Set(balances.flatMap((b) => [b.fromUserId, b.toUserId]))],
    [balances],
  );
  const minIds = useMemo(
    () => [...new Set(minimized.flatMap((t) => [t.fromId, t.toId]))],
    [minimized],
  );

  const currentPositions = useMemo(() => buildPositions(currentIds, nameMap), [currentIds, nameMap]);
  const minPositions = useMemo(() => buildPositions(minIds, nameMap), [minIds, nameMap]);

  const currentArrows: ArrowSpec[] = balances.map((b) => ({
    fromId: b.fromUserId,
    toId: b.toUserId,
    amount: b.amount,
    label: `${b.amount.toFixed(2)} ${b.currency}`,
  }));

  const minArrows: ArrowSpec[] = minimized.map((t) => ({
    fromId: t.fromId,
    toId: t.toId,
    amount: t.amount,
    label: `${t.amount.toFixed(2)} ${currency}`,
  }));

  const saved = balances.length - minimized.length;

  if (balances.length === 0) return null;

  return (
    <div className="mt-6 space-y-5">
      {/* ── Current state graph ── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{t('groupDetail.vizCurrentTitle')}</span>
          <span className="text-xs bg-red-100 text-expense px-2 py-0.5 rounded-full font-medium">
            {t('groupDetail.vizTxCount', { count: balances.length })}
          </span>
        </div>
        <div className="p-2">
          <DebtGraph
            arrows={currentArrows}
            positions={currentPositions}
            stroke="#dc2626"
            markerId="arrow-current"
            labelFill="#dc2626"
            nodeBg="#fff1f2"
          />
        </div>
      </div>

      {/* ── Minimized plan ── */}
      <div className="rounded-xl border border-green-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-green-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{t('groupDetail.vizMinTitle')}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-100 text-income px-2 py-0.5 rounded-full font-medium">
              {t('groupDetail.vizTxCount', { count: minimized.length })}
            </span>
            {saved > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {t('groupDetail.vizSaved', { count: saved })}
              </span>
            )}
          </div>
        </div>

        {minimized.length > 0 && (
          <>
            <div className="p-2">
              <DebtGraph
                arrows={minArrows}
                positions={minPositions}
                stroke="#16a34a"
                markerId="arrow-min"
                labelFill="#15803d"
                nodeBg="#f0fdf4"
              />
            </div>

            {/* Numbered transaction list */}
            <div className="px-4 pb-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {t('groupDetail.vizPlan')}
              </p>
              {minimized.map((tx, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-green-100 text-income flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="font-medium text-slate-900 truncate">{tx.fromName}</span>
                    <span className="text-slate-400 shrink-0">→</span>
                    <span className="font-medium text-slate-900 truncate">{tx.toName}</span>
                  </div>
                  <span className="font-semibold text-income shrink-0">
                    {tx.amount.toFixed(2)} {currency}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {minimized.length === 0 && (
          <p className="p-6 text-center text-income font-medium text-sm">
            {t('groupDetail.vizAllSettled')}
          </p>
        )}
      </div>
    </div>
  );
}
