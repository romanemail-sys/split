import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGroup } from '../../hooks/useGroups';
import { useCreateExpense, useUpdateExpense, useExpense, useCategories } from '../../hooks/useExpenses';
import { useAuthStore } from '../../stores/auth.store';
import { SplitEditor } from '../../components/expense/SplitEditor';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { CurrencySelect } from '../../components/CurrencySelect';
const SPLIT_TYPES = ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'];
function initials(name) {
    return name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
}
function MemberPicker({ members, selectedIds, paidById, onToggle, onSelectAll, }) {
    const { t } = useTranslation();
    const allSelected = members.every((m) => selectedIds.has(m.userId));
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { children: t('expense.participants') }), _jsx("button", { type: "button", onClick: onSelectAll, className: "text-xs text-blue-600 hover:underline", children: allSelected ? t('expense.deselectAll') : t('expense.selectAll') })] }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: members.map((m) => {
                    const selected = selectedIds.has(m.userId);
                    const isPayer = m.userId === paidById;
                    return (_jsxs("button", { type: "button", onClick: () => onToggle(m.userId), className: `relative flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-start transition-all ${selected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white opacity-60 hover:opacity-80'}`, children: [_jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`, children: initials(m.user.name) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-slate-900 truncate", children: m.user.name }), isPayer && (_jsx("p", { className: "text-xs text-blue-500", children: t('expense.payer') }))] }), selected && (_jsx("span", { className: "absolute top-1.5 end-1.5 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center", children: _jsx("svg", { viewBox: "0 0 10 8", className: "w-2.5 h-2.5 text-white fill-current", children: _jsx("path", { d: "M1 4l2.5 2.5L9 1", stroke: "white", strokeWidth: "1.5", fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }) }) }))] }, m.userId));
                }) }), _jsx("p", { className: "text-xs text-slate-400", children: t('expense.participantCount', { count: selectedIds.size, total: members.length }) })] }));
}
export function ExpenseFormPage() {
    const { t } = useTranslation();
    const { id: expenseId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const groupId = searchParams.get('groupId') ?? '';
    const { data: existingExpense } = useExpense(expenseId ?? '');
    const resolvedGroupId = existingExpense?.groupId ?? groupId;
    const { data: group } = useGroup(resolvedGroupId);
    const { data: categories } = useCategories();
    const createExpense = useCreateExpense();
    const updateExpense = useUpdateExpense(expenseId ?? '');
    const currentUser = useAuthStore((s) => s.user);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [categoryId, setCategoryId] = useState('');
    const [splitType, setSplitType] = useState('EQUAL');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paidById, setPaidById] = useState('');
    const [splits, setSplits] = useState([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
    const [error, setError] = useState('');
    const [initialized, setInitialized] = useState(false);
    // Initialize from group on first load
    useEffect(() => {
        if (group && !initialized) {
            setInitialized(true);
            setPaidById(currentUser?.id ?? '');
            const allIds = new Set(group.members.map((m) => m.userId));
            setSelectedMemberIds(allIds);
            setSplits(group.members.map((m) => ({ userId: m.userId, amount: 0, percentage: 0, shares: 1 })));
            setCurrency(group.defaultCurrency);
        }
    }, [group, currentUser, initialized]);
    // Initialize from existing expense when editing
    useEffect(() => {
        if (existingExpense) {
            setDescription(existingExpense.description);
            setAmount(String(existingExpense.amount));
            setCurrency(existingExpense.currency);
            setCategoryId(existingExpense.categoryId ?? '');
            setSplitType(existingExpense.splitType);
            setDate(existingExpense.date);
            setPaidById(existingExpense.paidById);
            const existingSplits = existingExpense.splits.map((s) => ({
                userId: s.userId,
                amount: s.amount,
                percentage: 0,
                shares: 1,
            }));
            setSplits(existingSplits);
            setSelectedMemberIds(new Set(existingExpense.splits.map((s) => s.userId)));
        }
    }, [existingExpense]);
    function toggleMember(userId) {
        const isSelected = selectedMemberIds.has(userId);
        if (isSelected && selectedMemberIds.size <= 1)
            return; // keep at least one
        const next = new Set(selectedMemberIds);
        if (isSelected) {
            next.delete(userId);
            setSplits((prev) => prev.filter((s) => s.userId !== userId));
        }
        else {
            next.add(userId);
            setSplits((prev) => [...prev, { userId, amount: 0, percentage: 0, shares: 1 }]);
        }
        setSelectedMemberIds(next);
    }
    function handleSelectAll() {
        if (!group)
            return;
        const allSelected = group.members.every((m) => selectedMemberIds.has(m.userId));
        if (allSelected) {
            // Deselect all except first
            const first = group.members[0];
            if (!first)
                return;
            setSelectedMemberIds(new Set([first.userId]));
            setSplits([{ userId: first.userId, amount: 0, percentage: 0, shares: 1 }]);
        }
        else {
            const allIds = new Set(group.members.map((m) => m.userId));
            setSelectedMemberIds(allIds);
            setSplits(group.members.map((m) => {
                const existing = splits.find((s) => s.userId === m.userId);
                return existing ?? { userId: m.userId, amount: 0, percentage: 0, shares: 1 };
            }));
        }
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            const activeSplits = splits.filter((s) => selectedMemberIds.has(s.userId));
            if (expenseId && existingExpense) {
                await updateExpense.mutateAsync({
                    description, amount: parseFloat(amount), currency,
                    categoryId: categoryId || null, splitType, date,
                    splits: activeSplits,
                });
                navigate(`/groups/${existingExpense.groupId}`);
            }
            else {
                const expense = await createExpense.mutateAsync({
                    groupId: resolvedGroupId, paidById, description,
                    amount: parseFloat(amount), currency,
                    categoryId: categoryId || undefined, splitType, date,
                    splits: activeSplits,
                });
                navigate(`/groups/${expense.groupId}`);
            }
        }
        catch {
            setError(t('expense.failed'));
        }
    }
    if (!group)
        return _jsx("div", { className: "p-6 text-slate-400", children: t('expense.loading') });
    const selectedMembers = group.members.filter((m) => selectedMemberIds.has(m.userId));
    const isPending = createExpense.isPending || updateExpense.isPending;
    const parsedAmount = parseFloat(amount) || 0;
    return (_jsxs("div", { className: "max-w-lg mx-auto p-6", children: [_jsx("h1", { className: "text-2xl font-bold mb-6 text-slate-900", children: expenseId ? t('expense.editExpense') : t('expense.addExpense') }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(Label, { htmlFor: "description", children: t('expense.description') }), _jsx(Input, { id: "description", value: description, onChange: (e) => setDescription(e.target.value), required: true })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("div", { className: "space-y-1 flex-1", children: [_jsx(Label, { htmlFor: "amount", children: t('expense.amount') }), _jsx(Input, { id: "amount", type: "number", min: "0.01", step: "0.01", value: amount, onChange: (e) => setAmount(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-1 w-52", children: [_jsx(Label, { htmlFor: "currency", children: t('expense.currency') }), _jsx(CurrencySelect, { id: "currency", value: currency, onChange: setCurrency })] })] }), _jsxs("div", { className: "space-y-1", children: [_jsx(Label, { htmlFor: "date", children: t('expense.date') }), _jsx(Input, { id: "date", type: "date", value: date, onChange: (e) => setDate(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-1", children: [_jsx(Label, { htmlFor: "paidBy", children: t('expense.paidBy') }), _jsx("select", { id: "paidBy", value: paidById, onChange: (e) => setPaidById(e.target.value), className: "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900", children: group.members.map((m) => (_jsx("option", { value: m.userId, children: m.user.name }, m.userId))) })] }), categories && categories.length > 0 && (_jsxs("div", { className: "space-y-1", children: [_jsx(Label, { htmlFor: "category", children: t('expense.category') }), _jsxs("select", { id: "category", value: categoryId, onChange: (e) => setCategoryId(e.target.value), className: "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900", children: [_jsx("option", { value: "", children: t('expense.noCategory') }), categories.map((c) => (_jsxs("option", { value: c.id, children: [c.icon, " ", c.name] }, c.id)))] })] })), _jsx(MemberPicker, { members: group.members, selectedIds: selectedMemberIds, paidById: paidById, onToggle: toggleMember, onSelectAll: handleSelectAll }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: t('expense.splitType') }), _jsx("div", { className: "flex gap-2 flex-wrap", children: SPLIT_TYPES.map((type) => (_jsx("button", { type: "button", onClick: () => setSplitType(type), className: `px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${splitType === type
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`, children: t(`expense.splitTypeOptions.${type}`) }, type))) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: t('expense.splitDetails') }), _jsx(SplitEditor, { splitType: splitType, members: selectedMembers, splits: splits, onChange: setSplits, amount: parsedAmount, currency: currency })] }), error && _jsx("p", { className: "text-sm text-red-600", children: error }), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => navigate(-1), className: "flex-1", children: t('expense.cancel') }), _jsx(Button, { type: "submit", disabled: isPending, className: "flex-1", children: isPending
                                    ? t('expense.saving')
                                    : expenseId
                                        ? t('expense.saveChanges')
                                        : t('expense.addExpenseBtn') })] })] })] }));
}
