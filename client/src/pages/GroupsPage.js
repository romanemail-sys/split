import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGroups, useCreateGroup } from '../hooks/useGroups';
import { GroupCard } from '../components/GroupCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { CurrencySelect } from '../components/CurrencySelect';
export function GroupsPage() {
    const { t } = useTranslation();
    const { data: groups, isLoading } = useGroups();
    const createGroup = useCreateGroup();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [error, setError] = useState('');
    async function handleCreate(e) {
        e.preventDefault();
        setError('');
        try {
            await createGroup.mutateAsync({ name, description: description || undefined, defaultCurrency: currency });
            setOpen(false);
            setName('');
            setDescription('');
            setCurrency('USD');
        }
        catch {
            setError(t('groups.failed'));
        }
    }
    return (_jsxs("div", { className: "max-w-4xl mx-auto p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900", children: t('groups.title') }), _jsx(Button, { onClick: () => setOpen(true), children: t('groups.newGroup') })] }), isLoading ? (_jsx("div", { className: "text-center py-12 text-slate-400", children: t('groups.loading') })) : groups?.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-slate-400", children: [_jsx("p", { className: "mb-4", children: t('groups.noGroups') }), _jsx(Button, { onClick: () => setOpen(true), children: t('groups.createFirst') })] })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: groups?.map((group) => _jsx(GroupCard, { group: group }, group.id)) })), _jsx(Dialog, { open: open, onOpenChange: setOpen, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: t('groups.createGroup') }) }), _jsxs("form", { onSubmit: handleCreate, className: "space-y-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(Label, { htmlFor: "name", children: t('groups.name') }), _jsx(Input, { id: "name", value: name, onChange: (e) => setName(e.target.value), required: true })] }), _jsxs("div", { className: "space-y-1", children: [_jsx(Label, { htmlFor: "description", children: t('groups.description') }), _jsx(Input, { id: "description", value: description, onChange: (e) => setDescription(e.target.value) })] }), _jsxs("div", { className: "space-y-1", children: [_jsx(Label, { htmlFor: "currency", children: t('groups.defaultCurrency') }), _jsx(CurrencySelect, { id: "currency", value: currency, onChange: setCurrency })] }), error && _jsx("p", { className: "text-sm text-red-600", children: error }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setOpen(false), children: t('groups.cancel') }), _jsx(Button, { type: "submit", disabled: createGroup.isPending, children: createGroup.isPending ? t('groups.creating') : t('groups.create') })] })] })] }) })] }));
}
