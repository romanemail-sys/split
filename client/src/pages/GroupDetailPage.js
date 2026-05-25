import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGroup, useGroupBalances, useGroupActivity, useSettleMembers, useInviteMember, useRemoveMember, useInviteCandidates, } from '../hooks/useGroups';
import { useExpenses } from '../hooks/useExpenses';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { CurrencySelect } from '../components/CurrencySelect';
import { useCurrencyRate } from '../hooks/useCurrencyRate';
import { DebtVisualization } from '../components/DebtVisualization';
// Bit (ביט) and Paybox payment app links
function PayLinks({ amount, currency }) {
    const { t } = useTranslation();
    const label = `${amount.toFixed(2)} ${currency}`;
    return (_jsxs("div", { className: "flex items-center gap-1.5 text-xs", children: [_jsxs("span", { className: "text-slate-400", children: [t('groupDetail.payWith'), ":"] }), _jsx("a", { href: `https://www.bitpay.co.il/app/pay?amount=${amount}`, target: "_blank", rel: "noopener noreferrer", title: `Bit – ${label}`, className: "flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7B2FBE] text-white font-semibold hover:opacity-80 transition-opacity", children: "\u05D1\u05D9\u05D8" }), _jsx("a", { href: "https://payboxapp.page.link/pay", target: "_blank", rel: "noopener noreferrer", title: `Paybox – ${label}`, className: "flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5A623] text-white font-semibold hover:opacity-80 transition-opacity", children: "Paybox" })] }));
}
function activityIcon(type) {
    if (type === 'EXPENSE_CREATED')
        return '🧾';
    if (type === 'SPLIT_SETTLED')
        return '✅';
    if (type === 'MEMBER_JOINED')
        return '👤';
    return '•';
}
export function GroupDetailPage() {
    const { t } = useTranslation();
    const { id = '' } = useParams();
    const { data: group, isLoading } = useGroup(id);
    const { data: balances } = useGroupBalances(id);
    const { data: activity } = useGroupActivity(id);
    const settleMembers = useSettleMembers(id);
    const { data: expensesPage } = useExpenses(id);
    const inviteMember = useInviteMember(id);
    const removeMember = useRemoveMember(id);
    const currentUserId = useAuthStore((s) => s.user?.id);
    const [tab, setTab] = useState('expenses');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteSearch, setInviteSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const { data: inviteCandidates = [] } = useInviteCandidates(id, inviteSearch);
    const [viewCurrency, setViewCurrency] = useState('');
    // Must be unconditional — called before early returns
    const { data: convRate } = useCurrencyRate(group?.defaultCurrency ?? '', viewCurrency);
    async function handleInvite(e) {
        e.preventDefault();
        setInviteError('');
        const email = selectedUser ? selectedUser.email : inviteSearch.trim();
        if (!email)
            return;
        try {
            await inviteMember.mutateAsync({ email });
            setInviteOpen(false);
            setInviteSearch('');
            setSelectedUser(null);
        }
        catch {
            setInviteError(t('groupDetail.inviteFailed'));
        }
    }
    function handleInviteSelect(user) {
        setSelectedUser(user);
        setInviteSearch(user.name);
        setShowDropdown(false);
    }
    function handleInviteSearchChange(val) {
        setInviteSearch(val);
        setSelectedUser(null);
        setShowDropdown(true);
    }
    function handleInviteClose(open) {
        setInviteOpen(open);
        if (!open) {
            setInviteSearch('');
            setSelectedUser(null);
            setInviteError('');
            setShowDropdown(false);
        }
    }
    if (isLoading)
        return _jsx("div", { className: "p-6 text-slate-400", children: t('groupDetail.loading') });
    if (!group)
        return _jsx("div", { className: "p-6 text-red-600", children: t('groupDetail.notFound') });
    if (!viewCurrency && group.defaultCurrency)
        setViewCurrency(group.defaultCurrency);
    const isAdmin = group.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';
    const TABS = ['expenses', 'members', 'balances', 'history'];
    const rate = convRate?.rate ?? 1;
    const displayCurrency = viewCurrency || group.defaultCurrency;
    const showConversion = viewCurrency && viewCurrency !== group.defaultCurrency;
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-6", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl", children: group.name[0].toUpperCase() }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900", children: group.name }), group.description && _jsx("p", { className: "text-slate-500 text-sm", children: group.description })] })] }), _jsxs("div", { className: "flex items-center justify-between mb-4 gap-3 flex-wrap", children: [_jsx("div", { className: "flex gap-1 border-b border-slate-200 overflow-x-auto flex-1", children: TABS.map((tabKey) => (_jsx("button", { onClick: () => setTab(tabKey), className: `px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === tabKey
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-900'}`, children: t(`groupDetail.tabs.${tabKey}`) }, tabKey))) }), _jsx("div", { className: "w-40 shrink-0", children: _jsx(CurrencySelect, { value: viewCurrency, onChange: setViewCurrency }) })] }), tab === 'expenses' && (_jsxs("div", { children: [_jsx("div", { className: "flex justify-end mb-4", children: _jsx(Link, { to: `/expenses/new?groupId=${id}`, className: "inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors", children: t('groupDetail.addExpense') }) }), expensesPage?.expenses.length === 0 ? (_jsx("p", { className: "text-center text-slate-400 py-8", children: t('groupDetail.noExpenses') })) : (_jsx("div", { className: "space-y-2", children: expensesPage?.expenses.map((expense) => {
                            const allSettled = expense.splits.length > 0 && expense.splits.every((s) => s.isSettled);
                            return (_jsxs(Link, { to: `/expenses/${expense.id}`, className: `flex items-center justify-between p-4 rounded-lg border transition-colors ${allSettled
                                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                                    : 'border-slate-200 hover:bg-slate-50'}`, children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: `font-medium ${allSettled ? 'text-income' : 'text-slate-900'}`, children: expense.description }), allSettled && (_jsx("span", { className: "text-xs bg-green-100 text-income px-2 py-0.5 rounded-full", children: t('expense.settled') }))] }), _jsxs("p", { className: "text-sm text-slate-500", children: [t('groupDetail.paidBy', { name: expense.paidBy.name }), " \u00B7 ", expense.date] })] }), _jsxs("div", { className: "text-end", children: [_jsxs("p", { className: `font-semibold ${allSettled ? 'text-income' : 'text-expense'}`, children: [(expense.amountBase * rate).toFixed(2), " ", displayCurrency] }), showConversion && (_jsxs("p", { className: "text-xs text-slate-400", children: [expense.amount.toFixed(2), " ", expense.currency] }))] })] }, expense.id));
                        }) }))] })), tab === 'members' && (_jsxs("div", { children: [isAdmin && (_jsx("div", { className: "flex justify-end mb-4", children: _jsx(Button, { onClick: () => setInviteOpen(true), children: t('groupDetail.inviteMember') }) })), _jsx("div", { className: "space-y-2", children: group.members.map((m) => (_jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg border border-slate-200", children: [_jsxs("div", { className: "flex items-center gap-3", children: [m.user.avatarUrl ? (_jsx("img", { src: m.user.avatarUrl, alt: m.user.name, className: "w-8 h-8 rounded-full" })) : (_jsx("div", { className: "w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600", children: m.user.name[0].toUpperCase() })), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-sm text-slate-900", children: m.user.name }), _jsx("p", { className: "text-xs text-slate-500", children: m.role })] })] }), isAdmin && m.userId !== currentUserId && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => removeMember.mutate(m.userId), children: t('groupDetail.remove') }))] }, m.id))) }), _jsx(Dialog, { open: inviteOpen, onOpenChange: handleInviteClose, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: t('groupDetail.inviteMember') }) }), _jsxs("form", { onSubmit: handleInvite, className: "space-y-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(Label, { htmlFor: "invite-search", children: t('groupDetail.email') }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "invite-search", autoComplete: "off", value: inviteSearch, onChange: (e) => handleInviteSearchChange(e.target.value), onFocus: () => setShowDropdown(true), placeholder: t('groupDetail.invitePlaceholder') }), showDropdown && inviteCandidates.length > 0 && (_jsx("ul", { className: "absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto", children: inviteCandidates.map((u) => (_jsxs("li", { className: "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50", onMouseDown: (e) => { e.preventDefault(); handleInviteSelect(u); }, children: [_jsx("div", { className: "w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0", children: u.name[0].toUpperCase() }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-slate-900 truncate", children: u.name }), _jsx("p", { className: "text-xs text-slate-500 truncate", children: u.email })] })] }, u.id))) }))] }), selectedUser && (_jsxs("p", { className: "text-xs text-green-600 flex items-center gap-1 mt-1", children: [_jsx("span", { children: "\u2713" }), " ", selectedUser.email] }))] }), inviteError && _jsx("p", { className: "text-sm text-red-600", children: inviteError }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => handleInviteClose(false), children: t('expense.cancel') }), _jsx(Button, { type: "submit", disabled: inviteMember.isPending || (!selectedUser && !inviteSearch.trim()), children: inviteMember.isPending ? t('groupDetail.inviting') : t('groupDetail.invite') })] })] })] }) })] })), tab === 'balances' && (_jsx("div", { children: !balances?.length ? (_jsx("p", { className: "text-center text-slate-400 py-8", children: t('groupDetail.noBalances') })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "space-y-3", children: balances.map((b, i) => {
                                const converted = b.amount * rate;
                                const canSettle = b.fromUserId === currentUserId ||
                                    b.toUserId === currentUserId ||
                                    isAdmin;
                                return (_jsxs("div", { className: "p-4 rounded-xl border border-slate-200 bg-white space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900", children: b.fromName }), _jsx("span", { className: "text-slate-400", children: "\u2192" }), _jsx("span", { className: "font-medium text-slate-900", children: b.toName })] }), _jsxs("div", { className: "text-end", children: [_jsxs("p", { className: "font-semibold text-expense", children: [converted.toFixed(2), " ", displayCurrency] }), showConversion && (_jsxs("p", { className: "text-xs text-slate-400", children: [b.amount.toFixed(2), " ", b.currency] }))] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(PayLinks, { amount: converted, currency: displayCurrency }), canSettle && (_jsx(Button, { size: "sm", variant: "outline", disabled: settleMembers.isPending, onClick: () => settleMembers.mutate({ fromUserId: b.fromUserId, toUserId: b.toUserId }), children: t('groupDetail.settleUp') }))] })] }, i));
                            }) }), _jsx(DebtVisualization, { balances: balances, members: group.members, currency: displayCurrency, rate: rate })] })) })), tab === 'history' && (_jsx("div", { children: !activity?.length ? (_jsx("p", { className: "text-center text-slate-400 py-8", children: t('groupDetail.noHistory') })) : (_jsx("div", { className: "space-y-1", children: activity.map((item) => {
                        let text = '';
                        if (item.type === 'EXPENSE_CREATED') {
                            text = t('groupDetail.activityExpenseCreated', { description: item.description });
                        }
                        else if (item.type === 'SPLIT_SETTLED') {
                            text = t('groupDetail.activitySplitSettled', { description: item.description });
                        }
                        else if (item.type === 'MEMBER_JOINED') {
                            text = t('groupDetail.activityMemberJoined');
                        }
                        const dateStr = new Date(item.date).toLocaleDateString(undefined, {
                            day: '2-digit', month: 'short', year: 'numeric',
                        });
                        const timeStr = new Date(item.date).toLocaleTimeString(undefined, {
                            hour: '2-digit', minute: '2-digit',
                        });
                        return (_jsxs("div", { className: "flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0", children: [_jsx("span", { className: "text-lg leading-none mt-0.5", children: activityIcon(item.type) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("p", { className: "text-sm text-slate-900", children: [_jsx("span", { className: "font-medium", children: item.actorName }), ' ', text, item.amount != null && item.currency && (_jsxs("span", { className: "ms-1 font-semibold text-expense", children: [item.amount.toFixed(2), " ", item.currency] }))] }), item.expenseId && (_jsx(Link, { to: `/expenses/${item.expenseId}`, className: "text-xs text-blue-500 hover:underline", children: item.description }))] }), _jsxs("div", { className: "text-end shrink-0", children: [_jsx("p", { className: "text-xs text-slate-500", children: dateStr }), _jsx("p", { className: "text-xs text-slate-400", children: timeStr })] })] }, item.id));
                    }) })) }))] }));
}
