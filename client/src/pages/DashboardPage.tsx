import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth.store';
import { useDashboard } from '../hooks/useMe';

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useDashboard();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('dashboard.greeting', { name: user?.name })}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('dashboard.youAreOwed')}
          value={isLoading ? '…' : `${data?.totalOwed.toFixed(2) ?? '0.00'}`}
          color="border-green-200 bg-green-50"
        />
        <StatCard
          label={t('dashboard.youOwe')}
          value={isLoading ? '…' : `${data?.totalIOwe.toFixed(2) ?? '0.00'}`}
          color="border-red-200 bg-red-50"
        />
        <StatCard
          label={t('dashboard.groups')}
          value={isLoading ? '…' : String(data?.groupCount ?? 0)}
          color="border-blue-200 bg-blue-50"
        />
        <StatCard
          label={t('dashboard.expenses')}
          value={isLoading ? '…' : String(data?.expenseCount ?? 0)}
          color="border-slate-200 bg-slate-50"
        />
      </div>

      {/* Recent expenses */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">{t('dashboard.recentExpenses')}</h2>
        {isLoading && <p className="text-slate-400 text-sm">{t('common.loading')}</p>}
        {!isLoading && data?.recentExpenses.length === 0 && (
          <p className="text-slate-400 text-sm">{t('dashboard.noExpenses')}</p>
        )}
        <div className="space-y-2">
          {data?.recentExpenses.map((e) => (
            <Link
              key={e.id}
              to={`/expenses/${e.id}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">{e.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {e.isMyExpense ? t('dashboard.youPaid') : t('dashboard.paidBy', { name: e.paidByName })}
                  {' · '}{e.groupName}{' · '}{e.date}
                </p>
              </div>
              <span className={`ms-3 font-semibold text-sm shrink-0 ${e.isMyExpense ? 'text-income' : 'text-expense'}`}>
                {e.amount.toFixed(2)} {e.currency}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
