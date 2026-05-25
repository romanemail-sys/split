import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
// Greedy debt-minimization: compute net balance per person, then greedily match largest debtor to largest creditor
function minimizeTransactions(balances) {
    const net = new Map();
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
    const txs = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
        const d = debtors[di];
        const c = creditors[ci];
        const amount = Math.round(Math.min(-d.amount, c.amount) * 100) / 100;
        txs.push({ fromId: d.id, fromName: d.name, toId: c.id, toName: c.name, amount });
        d.amount += amount;
        c.amount -= amount;
        if (Math.abs(d.amount) < 0.005)
            di++;
        if (Math.abs(c.amount) < 0.005)
            ci++;
    }
    return txs;
}
// ─── SVG graph helpers ────────────────────────────────────────────────────────
const NODE_R = 28;
const W = 520;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const NODE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#84cc16'];
function buildPositions(ids, nameMap) {
    const n = ids.length;
    const r = n <= 2 ? 100 : Math.min(130, (Math.min(W, H) / 2) - NODE_R - 16);
    const map = new Map();
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
function DebtGraph({ arrows, positions, stroke, markerId, labelFill, nodeBg, }) {
    const maxAmt = Math.max(...arrows.map((a) => a.amount), 1);
    return (_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full", style: { maxHeight: 280 }, children: [_jsx("defs", { children: _jsx("marker", { id: markerId, markerWidth: "9", markerHeight: "9", refX: "7", refY: "3", orient: "auto", children: _jsx("path", { d: "M0,0 L0,6 L9,3 z", fill: stroke }) }) }), arrows.map(({ fromId, toId, amount, label }) => {
                const s = positions.get(fromId);
                const e = positions.get(toId);
                if (!s || !e)
                    return null;
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
                return (_jsxs("g", { children: [_jsx("path", { d: `M${sx},${sy} Q${cpx},${cpy} ${ex},${ey}`, fill: "none", stroke: stroke, strokeWidth: sw, markerEnd: `url(#${markerId})`, opacity: 0.7 }), _jsx("rect", { x: lx - 26, y: ly - 9, width: 52, height: 18, rx: 9, fill: "white", stroke: stroke, strokeWidth: 1, opacity: 0.92 }), _jsx("text", { x: lx, y: ly + 4, textAnchor: "middle", fontSize: 9.5, fill: labelFill, fontWeight: "700", children: label })] }, key));
            }), [...positions.entries()].map(([id, pos]) => (_jsxs("g", { children: [_jsx("circle", { cx: pos.x, cy: pos.y, r: NODE_R, fill: nodeBg, stroke: pos.color, strokeWidth: 2.5 }), _jsx("text", { x: pos.x, y: pos.y + 4, textAnchor: "middle", fontSize: 13, fontWeight: "800", fill: pos.color, children: pos.initials }), _jsx("text", { x: pos.x, y: pos.y + NODE_R + 14, textAnchor: "middle", fontSize: 10.5, fill: "#475569", fontWeight: "500", children: pos.firstName })] }, id)))] }));
}
export function DebtVisualization({ balances, members, currency, rate = 1 }) {
    const { t } = useTranslation();
    const minimized = useMemo(() => minimizeTransactions(balances), [balances]);
    // Name lookup for all people mentioned
    const nameMap = useMemo(() => {
        const m = new Map();
        for (const b of balances) {
            m.set(b.fromUserId, b.fromName);
            m.set(b.toUserId, b.toName);
        }
        for (const gm of members) {
            m.set(gm.userId, gm.user.name);
        }
        return m;
    }, [balances, members]);
    const currentIds = useMemo(() => [...new Set(balances.flatMap((b) => [b.fromUserId, b.toUserId]))], [balances]);
    const minIds = useMemo(() => [...new Set(minimized.flatMap((t) => [t.fromId, t.toId]))], [minimized]);
    const currentPositions = useMemo(() => buildPositions(currentIds, nameMap), [currentIds, nameMap]);
    const minPositions = useMemo(() => buildPositions(minIds, nameMap), [minIds, nameMap]);
    const currentArrows = balances.map((b) => ({
        fromId: b.fromUserId,
        toId: b.toUserId,
        amount: b.amount * rate,
        label: `${(b.amount * rate).toFixed(2)} ${currency}`,
    }));
    const minArrows = minimized.map((t) => ({
        fromId: t.fromId,
        toId: t.toId,
        amount: t.amount * rate,
        label: `${(t.amount * rate).toFixed(2)} ${currency}`,
    }));
    const saved = balances.length - minimized.length;
    if (balances.length === 0)
        return null;
    return (_jsxs("div", { className: "mt-6 space-y-5", children: [_jsxs("div", { className: "rounded-xl border border-slate-200 bg-white overflow-hidden", children: [_jsxs("div", { className: "px-4 py-3 border-b border-slate-100 flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-semibold text-slate-700", children: t('groupDetail.vizCurrentTitle') }), _jsx("span", { className: "text-xs bg-red-100 text-expense px-2 py-0.5 rounded-full font-medium", children: t('groupDetail.vizTxCount', { count: balances.length }) })] }), _jsx("div", { className: "p-2", children: _jsx(DebtGraph, { arrows: currentArrows, positions: currentPositions, stroke: "#dc2626", markerId: "arrow-current", labelFill: "#dc2626", nodeBg: "#fff1f2" }) })] }), _jsxs("div", { className: "rounded-xl border border-green-200 bg-white overflow-hidden", children: [_jsxs("div", { className: "px-4 py-3 border-b border-green-100 flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-semibold text-slate-700", children: t('groupDetail.vizMinTitle') }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs bg-green-100 text-income px-2 py-0.5 rounded-full font-medium", children: t('groupDetail.vizTxCount', { count: minimized.length }) }), saved > 0 && (_jsx("span", { className: "text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium", children: t('groupDetail.vizSaved', { count: saved }) }))] })] }), minimized.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "p-2", children: _jsx(DebtGraph, { arrows: minArrows, positions: minPositions, stroke: "#16a34a", markerId: "arrow-min", labelFill: "#15803d", nodeBg: "#f0fdf4" }) }), _jsxs("div", { className: "px-4 pb-4 space-y-2", children: [_jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3", children: t('groupDetail.vizPlan') }), minimized.map((tx, i) => (_jsxs("div", { className: "flex items-center gap-3 text-sm", children: [_jsx("span", { className: "w-5 h-5 shrink-0 rounded-full bg-green-100 text-income flex items-center justify-center text-xs font-bold", children: i + 1 }), _jsxs("div", { className: "flex-1 flex items-center gap-2 min-w-0", children: [_jsx("span", { className: "font-medium text-slate-900 truncate", children: tx.fromName }), _jsx("span", { className: "text-slate-400 shrink-0", children: "\u2192" }), _jsx("span", { className: "font-medium text-slate-900 truncate", children: tx.toName })] }), _jsxs("span", { className: "font-semibold text-income shrink-0", children: [(tx.amount * rate).toFixed(2), " ", currency] })] }, i)))] })] })), minimized.length === 0 && (_jsx("p", { className: "p-6 text-center text-income font-medium text-sm", children: t('groupDetail.vizAllSettled') }))] })] }));
}
