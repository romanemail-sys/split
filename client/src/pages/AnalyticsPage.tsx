import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAnalytics } from '../hooks/useMe';

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};
const MONTH_HE: Record<string, string> = {
  '01': 'ינו', '02': 'פבר', '03': 'מרץ', '04': 'אפר',
  '05': 'מאי', '06': 'יונ', '07': 'יול', '08': 'אוג',
  '09': 'ספט', '10': 'אוק', '11': 'נוב', '12': 'דצמ',
};

function shortMonth(ym: string, lang: string) {
  const [, m] = ym.split('-');
  return lang === 'he' ? MONTH_HE[m] : MONTH_LABELS[m];
}

function MonthBars({ data }: { data: { month: string; amount: number }[] }) {
  const { i18n } = useTranslation();
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.amount), 1);
  const W = 480, H = 160, pad = 24, barW = Math.min(48, (W - pad * 2) / data.length - 8);
  const step = (W - pad * 2) / Math.max(data.length - 1, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full" style={{ maxHeight: 200 }}>
      {data.map((d, i) => {
        const x = data.length === 1 ? W / 2 : pad + i * step;
        const barH = Math.max(4, ((d.amount / max) * (H - 20)));
        const y = H - barH;
        return (
          <g key={d.month}>
            <rect x={x - barW / 2} y={y} width={barW} height={barH} rx={4} fill="#3b82f6" opacity={0.85} />
            <text x={x} y={H + 14} textAnchor="middle" fontSize={10} fill="#64748b">
              {shortMonth(d.month, i18n.language)}
            </text>
            <text x={x} y={y - 4} textAnchor="middle" fontSize={9} fill="#3b82f6" fontWeight="600">
              {d.amount >= 1000 ? `${(d.amount / 1000).toFixed(1)}k` : d.amount.toFixed(0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const CAT_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444','#84cc16'];

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAnalytics();

  if (isLoading) return <div className="p-6 text-slate-400">{t('common.loading')}</div>;
  if (!data || data.totalSpent === 0) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">{t('analytics.title')}</h1>
        <p className="text-slate-400">{t('analytics.noData')}</p>
      </div>
    );
  }

  const maxCat = Math.max(...data.byCategory.map((c) => c.amount), 1);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('analytics.title')}</h1>

      {/* Total */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-xs font-medium text-slate-500 mb-1">{t('analytics.totalSpent')}</p>
        <p className="text-3xl font-bold text-blue-700">{data.totalSpent.toFixed(2)}</p>
      </div>

      {/* Monthly bar chart */}
      {data.byMonth.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">{t('analytics.spendingByMonth')}</p>
          <MonthBars data={data.byMonth} />
        </div>
      )}

      {/* Category breakdown */}
      {data.byCategory.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700 mb-4">{t('analytics.spendingByCategory')}</p>
          <div className="space-y-3">
            {data.byCategory.map((c, i) => {
              const pct = Math.round((c.amount / data.totalSpent) * 100);
              const color = CAT_COLORS[i % CAT_COLORS.length];
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-900">{c.icon} {c.name}</span>
                    <div className="text-end">
                      <span className="text-sm font-semibold text-slate-900">{c.amount.toFixed(2)}</span>
                      <span className="ms-2 text-xs text-slate-400">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(c.amount / maxCat) * 100}%`, backgroundColor: color }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{t('analytics.transactions', { count: c.count })}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top expenses */}
      {data.topExpenses.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">{t('analytics.topExpenses')}</p>
          <div className="space-y-2">
            {data.topExpenses.map((e, i) => (
              <Link
                key={e.id}
                to={`/expenses/${e.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-slate-900 truncate">{e.description}</span>
                <span className="text-sm font-semibold text-expense shrink-0">
                  {e.amount.toFixed(2)} {e.currency}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
