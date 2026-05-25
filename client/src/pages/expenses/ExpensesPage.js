import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAllExpenses } from '../../hooks/useExpenses';
export function ExpensesPage() {
    const { t } = useTranslation();
    const { data, isLoading } = useAllExpenses();
    if (isLoading)
        return _jsx("div", { className: "p-6 text-slate-400", children: t('expenses.loading') });
    const expenses = data?.expenses ?? [];
    return (_jsxs("div", { className: "max-w-2xl mx-auto p-6", children: [_jsx("h1", { className: "text-2xl font-bold mb-6 text-slate-900", children: t('expenses.title') }), expenses.length === 0 ? (_jsx("p", { className: "text-slate-400", children: t('expenses.noExpenses') })) : (_jsx("div", { className: "space-y-3", children: expenses.map((expense) => (_jsxs(Link, { to: `/expenses/${expense.id}`, className: "flex justify-between items-center p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-slate-900", children: expense.description }), _jsx("p", { className: "text-sm text-slate-500", children: t('expenses.group', { name: expense.group?.name ?? expense.groupId }) }), _jsx("p", { className: "text-xs text-slate-400", children: expense.date })] }), _jsxs("span", { className: "font-semibold text-expense", children: [expense.amount.toFixed(2), " ", expense.currency] })] }, expense.id))) }))] }));
}
