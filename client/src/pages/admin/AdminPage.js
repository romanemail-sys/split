import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth.store';
import { useAdminUsers, useCreateUser, useToggleUserActive } from '../../hooks/useAdmin';
function StatusBadge({ isActive }) {
    const { t } = useTranslation();
    return (_jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`, children: isActive ? t('admin.statusActive') : t('admin.statusInactive') }));
}
function AddUserModal({ onClose }) {
    const { t } = useTranslation();
    const createUser = useCreateUser();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            await createUser.mutateAsync(form);
            onClose();
        }
        catch {
            setError(t('admin.failedCreate'));
        }
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-md p-6", children: [_jsx("h2", { className: "text-lg font-bold text-slate-900 mb-4", children: t('admin.addUser') }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: t('admin.name') }), _jsx("input", { type: "text", required: true, value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })), className: "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: t('admin.email') }), _jsx("input", { type: "email", required: true, value: form.email, onChange: (e) => setForm((f) => ({ ...f, email: e.target.value })), className: "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: t('admin.password') }), _jsx("input", { type: "text", required: true, minLength: 6, value: form.password, onChange: (e) => setForm((f) => ({ ...f, password: e.target.value })), className: "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), error && _jsx("p", { className: "text-sm text-red-600", children: error }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50", children: t('expense.cancel') }), _jsx("button", { type: "submit", disabled: createUser.isPending, className: "px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50", children: createUser.isPending ? t('admin.creating') : t('admin.create') })] })] })] }) }));
}
function UserRow({ user }) {
    const { t } = useTranslation();
    const currentUser = useAuthStore((s) => s.user);
    const toggle = useToggleUserActive();
    const isSelf = currentUser?.id === user.id;
    const date = new Date(user.createdAt).toLocaleDateString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric',
    });
    return (_jsxs("tr", { className: "border-t border-slate-100 hover:bg-slate-50", children: [_jsxs("td", { className: "px-4 py-3 text-sm text-slate-900", children: [user.name, user.isAdmin && (_jsx("span", { className: "ms-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium", children: t('admin.adminBadge') }))] }), _jsx("td", { className: "px-4 py-3 text-sm text-slate-600", children: user.email }), _jsx("td", { className: "px-4 py-3", children: _jsx(StatusBadge, { isActive: user.isActive }) }), _jsx("td", { className: "px-4 py-3 text-xs text-slate-400", children: date }), _jsx("td", { className: "px-4 py-3 text-end", children: _jsx("button", { disabled: isSelf || toggle.isPending, onClick: () => toggle.mutate({ userId: user.id, active: !user.isActive }), className: `text-xs px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${user.isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'}`, children: user.isActive ? t('admin.deactivate') : t('admin.activate') }) })] }));
}
export function AdminPage() {
    const { t } = useTranslation();
    const { data: users, isLoading } = useAdminUsers();
    const [showModal, setShowModal] = useState(false);
    return (_jsxs("div", { className: "max-w-4xl mx-auto p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900", children: t('admin.title') }), _jsxs("button", { onClick: () => setShowModal(true), className: "px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium", children: ["+ ", t('admin.addUser')] })] }), isLoading && _jsx("p", { className: "text-slate-400 text-sm", children: t('common.loading') }), !isLoading && users && (_jsx("div", { className: "rounded-xl border border-slate-200 bg-white overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-start", children: t('admin.name') }), _jsx("th", { className: "px-4 py-3 text-start", children: t('admin.email') }), _jsx("th", { className: "px-4 py-3 text-start", children: t('admin.status') }), _jsx("th", { className: "px-4 py-3 text-start", children: t('admin.createdAt') }), _jsx("th", { className: "px-4 py-3 text-end" })] }) }), _jsx("tbody", { children: users.map((u) => _jsx(UserRow, { user: u }, u.id)) })] }) })), showModal && _jsx(AddUserModal, { onClose: () => setShowModal(false) })] }));
}
