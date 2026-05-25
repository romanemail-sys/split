import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUserActivity } from '../hooks/useMe';
function icon(type) {
    if (type === 'EXPENSE_CREATED')
        return '🧾';
    if (type === 'SPLIT_SETTLED')
        return '✅';
    return '👤';
}
export function NotificationsPage() {
    const { t } = useTranslation();
    const { data: activity, isLoading } = useUserActivity();
    if (isLoading)
        return _jsx("div", { className: "p-6 text-slate-400", children: t('common.loading') });
    return (_jsxs("div", { className: "max-w-xl mx-auto p-6", children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900 mb-6", children: t('notifications.title') }), !activity?.length ? (_jsx("p", { className: "text-slate-400", children: t('notifications.noActivity') })) : (_jsx("div", { className: "space-y-0 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden", children: activity.map((item) => {
                    let text = '';
                    if (item.type === 'EXPENSE_CREATED') {
                        text = t('notifications.activityExpenseCreated', { description: item.description });
                    }
                    else if (item.type === 'SPLIT_SETTLED') {
                        text = t('notifications.activitySplitSettled', { description: item.description });
                    }
                    else {
                        text = t('notifications.activityMemberJoined', { groupName: item.groupName ?? '' });
                    }
                    const dateStr = new Date(item.date).toLocaleDateString(undefined, {
                        day: '2-digit', month: 'short',
                    });
                    const timeStr = new Date(item.date).toLocaleTimeString(undefined, {
                        hour: '2-digit', minute: '2-digit',
                    });
                    return (_jsxs("div", { className: "flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors", children: [_jsx("span", { className: "text-xl leading-none mt-0.5 shrink-0", children: icon(item.type) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("p", { className: "text-sm text-slate-900", children: [_jsx("span", { className: "font-semibold", children: item.actorName }), ' ', text, item.amount != null && item.currency && (_jsxs("span", { className: "ms-1 font-semibold text-expense", children: [item.amount.toFixed(2), " ", item.currency] }))] }), _jsxs("div", { className: "flex items-center gap-2 mt-0.5", children: [item.groupName && (_jsx(Link, { to: item.groupId ? `/groups/${item.groupId}` : '#', className: "text-xs text-blue-500 hover:underline", children: item.groupName })), item.expenseId && item.type !== 'MEMBER_JOINED' && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-slate-300", children: "\u00B7" }), _jsx(Link, { to: `/expenses/${item.expenseId}`, className: "text-xs text-slate-400 hover:underline", children: item.description })] }))] })] }), _jsxs("div", { className: "text-end shrink-0", children: [_jsx("p", { className: "text-xs text-slate-500", children: dateStr }), _jsx("p", { className: "text-xs text-slate-400", children: timeStr })] })] }, item.id));
                }) }))] }));
}
