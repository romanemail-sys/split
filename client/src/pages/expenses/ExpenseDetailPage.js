import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useExpense, useDeleteExpense, useSettleSplit } from '../../hooks/useExpenses';
import { useAuthStore } from '../../stores/auth.store';
import { useGroup } from '../../hooks/useGroups';
import { Button } from '../../components/ui/button';
import { useCurrencyRate } from '../../hooks/useCurrencyRate';
import { CurrencySelect } from '../../components/CurrencySelect';
export function ExpenseDetailPage() {
    const { t } = useTranslation();
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const { data: expense, isLoading } = useExpense(id);
    const { data: group } = useGroup(expense?.groupId ?? '');
    const deleteExpense = useDeleteExpense();
    const settleSplit = useSettleSplit(id, expense?.groupId);
    const currentUserId = useAuthStore((s) => s.user?.id);
    const [viewCurrency, setViewCurrency] = useState('');
    // Exchange rate for display conversion (baseCurrency → viewCurrency)
    const { data: rateData } = useCurrencyRate(expense?.currency ?? '', expense?.baseCurrency ?? '');
    const { data: viewRateData } = useCurrencyRate(expense?.baseCurrency ?? '', viewCurrency);
    if (isLoading)
        return _jsx("div", { className: "p-6 text-slate-400", children: t('expense.loading') });
    if (!expense)
        return _jsx("div", { className: "p-6 text-red-600", children: t('expense.notFound') });
    if (!viewCurrency && expense.baseCurrency)
        setViewCurrency(expense.baseCurrency);
    const isAdmin = group?.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';
    const canEdit = expense.paidById === currentUserId || isAdmin;
    const currencyMismatch = expense.currency !== expense.baseCurrency;
    const viewRate = viewRateData?.rate ?? 1;
    const displayCurrency = viewCurrency || expense.baseCurrency;
    const showConversion = viewCurrency && viewCurrency !== expense.baseCurrency;
    async function handleDelete() {
        if (!confirm(t('expense.confirmDelete')))
            return;
        await deleteExpense.mutateAsync({ expenseId: expense.id, groupId: expense.groupId });
        navigate(`/groups/${expense.groupId}`);
    }
    return (_jsxs("div", { className: "max-w-lg mx-auto p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900", children: expense.description }), canEdit && (_jsxs("div", { className: "flex gap-2", children: [_jsx(Link, { to: `/expenses/${id}/edit`, className: "inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors", children: t('expense.edit') }), _jsx(Button, { variant: "destructive", size: "sm", onClick: handleDelete, disabled: deleteExpense.isPending, children: t('expense.delete') })] }))] }), _jsxs("div", { className: "space-y-3 rounded-xl border border-slate-200 p-5 bg-white", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: t('expense.amount') }), _jsxs("span", { className: "font-semibold text-expense", children: [expense.amount.toFixed(2), " ", expense.currency] })] }), currencyMismatch && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: t('expense.baseAmount') }), _jsxs("span", { className: "text-slate-700", children: [expense.amountBase.toFixed(2), " ", expense.baseCurrency] })] })), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: t('expense.paidBy') }), _jsx("span", { className: "text-slate-900", children: expense.paidBy.name })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: t('expense.date') }), _jsx("span", { className: "text-slate-900", children: expense.date })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: t('expense.splitTypeLabel') }), _jsx("span", { className: "text-slate-900", children: expense.splitType })] }), expense.category && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: t('expense.categoryLabel') }), _jsxs("span", { className: "text-slate-900", children: [expense.category.icon, " ", expense.category.name] })] }))] }), currencyMismatch && rateData && (_jsx("div", { className: "mt-2 text-xs text-slate-400 text-end", children: t('expense.exchangeRate', {
                    from: rateData.from,
                    rate: rateData.rate.toFixed(4),
                    to: rateData.to,
                }) })), _jsxs("div", { className: "mt-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "font-semibold text-slate-900", children: t('expense.splits') }), _jsx("div", { className: "w-36", children: _jsx(CurrencySelect, { value: viewCurrency, onChange: setViewCurrency }) })] }), _jsx("div", { className: "space-y-2", children: expense.splits.map((split) => {
                            const canSettle = !split.isSettled && (split.userId === currentUserId ||
                                expense.paidById === currentUserId ||
                                isAdmin);
                            const convertedAmount = split.amount * viewRate;
                            return (_jsxs("div", { className: "flex justify-between items-center p-3 rounded-lg border border-slate-200", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-900", children: split.user?.name ?? split.userId }), split.isSettled && (_jsx("span", { className: "text-xs bg-green-100 text-income px-2 py-0.5 rounded-full", children: t('expense.settled') }))] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "text-end", children: [_jsxs("span", { className: `text-sm font-semibold ${split.isSettled ? 'text-income' : 'text-expense'}`, children: [convertedAmount.toFixed(2), " ", displayCurrency] }), showConversion && (_jsxs("p", { className: "text-xs text-slate-400", children: [split.amount.toFixed(2), " ", expense.baseCurrency] }))] }), canSettle && (_jsx(Button, { size: "sm", variant: "outline", disabled: settleSplit.isPending, onClick: () => settleSplit.mutate(split.id), children: settleSplit.isPending ? t('expense.settling') : t('expense.settleSplit') }))] })] }, split.id));
                        }) })] }), expense.receiptUrl && (_jsxs("div", { className: "mt-6", children: [_jsx("h2", { className: "font-semibold mb-3 text-slate-900", children: t('expense.receipt') }), _jsx("img", { src: expense.receiptUrl, alt: t('expense.receipt'), className: "rounded-lg border border-slate-200 max-w-full" })] })), _jsx("div", { className: "mt-6", children: _jsx(Link, { to: `/groups/${expense.groupId}`, className: "text-sm text-blue-600 hover:text-blue-800 transition-colors", children: t('expense.backToGroup') }) })] }));
}
