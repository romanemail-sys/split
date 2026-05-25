import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth.store';
import { useAdminUsers, useCreateUser, useToggleUserActive, useSetUserPassword, UserAdminDTO } from '../../hooks/useAdmin';

function StatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {isActive ? t('admin.statusActive') : t('admin.statusInactive')}
    </span>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const createUser = useCreateUser();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createUser.mutateAsync(form);
      onClose();
    } catch {
      setError(t('admin.failedCreate'));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('admin.addUser')}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.name')}</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.email')}</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.password')}</label>
            <input
              type="text"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {t('expense.cancel')}
            </button>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createUser.isPending ? t('admin.creating') : t('admin.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SetPasswordModal({ user, onClose }: { user: UserAdminDTO; onClose: () => void }) {
  const { t } = useTranslation();
  const setPassword = useSetUserPassword();
  const [password, setPassword_] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await setPassword.mutateAsync({ userId: user.id, password });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {
      setError(t('admin.failedSetPassword'));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">{t('admin.setPassword')}</h2>
        <p className="text-sm text-slate-500 mb-4">{user.name} · {user.email}</p>
        {done ? (
          <p className="text-sm text-green-600 font-medium text-center py-2">✓ {t('admin.passwordUpdated')}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              required
              minLength={6}
              autoFocus
              value={password}
              onChange={(e) => setPassword_(e.target.value)}
              placeholder={t('admin.newPasswordPlaceholder')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
                {t('expense.cancel')}
              </button>
              <button type="submit" disabled={setPassword.isPending || password.length < 6} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {setPassword.isPending ? t('admin.saving') : t('admin.save')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function UserRow({ user }: { user: UserAdminDTO }) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const toggle = useToggleUserActive();
  const isSelf = currentUser?.id === user.id;
  const [showSetPwd, setShowSetPwd] = useState(false);

  const date = new Date(user.createdAt).toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50">
        <td className="px-4 py-3 text-sm text-slate-900">
          {user.name}
          {user.isAdmin && (
            <span className="ms-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
              {t('admin.adminBadge')}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
        <td className="px-4 py-3"><StatusBadge isActive={user.isActive} /></td>
        <td className="px-4 py-3 text-xs text-slate-400">{date}</td>
        <td className="px-4 py-3 text-end">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowSetPwd(true)}
              className="text-xs px-3 py-1 rounded-lg font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              {t('admin.setPassword')}
            </button>
            <button
              disabled={isSelf || toggle.isPending}
              onClick={() => toggle.mutate({ userId: user.id, active: !user.isActive })}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                user.isActive
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              {user.isActive ? t('admin.deactivate') : t('admin.activate')}
            </button>
          </div>
        </td>
      </tr>
      {showSetPwd && <SetPasswordModal user={user} onClose={() => setShowSetPwd(false)} />}
    </>
  );
}

export function AdminPage() {
  const { t } = useTranslation();
  const { data: users, isLoading } = useAdminUsers();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('admin.title')}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + {t('admin.addUser')}
        </button>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">{t('common.loading')}</p>}

      {!isLoading && users && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-start">{t('admin.name')}</th>
                <th className="px-4 py-3 text-start">{t('admin.email')}</th>
                <th className="px-4 py-3 text-start">{t('admin.status')}</th>
                <th className="px-4 py-3 text-start">{t('admin.createdAt')}</th>
                <th className="px-4 py-3 text-end"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => <UserRow key={u.id} user={u} />)}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <AddUserModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
