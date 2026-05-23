import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAllExpenses } from '../../hooks/useExpenses';

export function ExpensesPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAllExpenses();

  if (isLoading) return <div className="p-6 text-slate-400">{t('expenses.loading')}</div>;

  const expenses = data?.expenses ?? [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-slate-900">{t('expenses.title')}</h1>
      {expenses.length === 0 ? (
        <p className="text-slate-400">{t('expenses.noExpenses')}</p>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <Link
              key={expense.id}
              to={`/expenses/${expense.id}`}
              className="flex justify-between items-center p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <div>
                <p className="font-medium text-slate-900">{expense.description}</p>
                <p className="text-sm text-slate-500">{t('expenses.group', { name: expense.group?.name ?? expense.groupId })}</p>
                <p className="text-xs text-slate-400">{expense.date}</p>
              </div>
              <span className="font-semibold text-expense">
                {expense.amount.toFixed(2)} {expense.currency}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
