import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth.store';
import {
  useAdminUsers, useCreateUser, useToggleUserActive, useSetUserPassword, UserAdminDTO,
  useAdminGroups, useAdminCreateGroup, useAdminFreezeGroup, useAdminDeleteGroup,
  useSendBalanceReport, GroupAdminDTO,
} from '../../hooks/useAdmin';

// ── Shared helpers ───────────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {isActive ? t('admin.statusActive') : t('admin.statusInactive')}
    </span>
  );
}

// ── User management ──────────────────────────────────────────────────────────

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
            <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.email')}</label>
            <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.password')}</label>
            <input type="text" required minLength={6} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">{t('expense.cancel')}</button>
            <button type="submit" disabled={createUser.isPending} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
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
            <input type="text" required minLength={6} autoFocus value={password} onChange={(e) => setPassword_(e.target.value)} placeholder={t('admin.newPasswordPlaceholder')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">{t('expense.cancel')}</button>
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

  const date = new Date(user.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50">
        <td className="px-4 py-3 text-sm text-slate-900">
          {user.name}
          {user.isAdmin && <span className="ms-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">{t('admin.adminBadge')}</span>}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
        <td className="px-4 py-3"><StatusBadge isActive={user.isActive} /></td>
        <td className="px-4 py-3 text-xs text-slate-400">{date}</td>
        <td className="px-4 py-3 text-end">
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setShowSetPwd(true)} className="text-xs px-3 py-1 rounded-lg font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">
              {t('admin.setPassword')}
            </button>
            <button
              disabled={isSelf || toggle.isPending}
              onClick={() => toggle.mutate({ userId: user.id, active: !user.isActive })}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${user.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
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

// ── Group management ─────────────────────────────────────────────────────────

function AddGroupModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const createGroup = useAdminCreateGroup();
  const [form, setForm] = useState({ name: '', description: '', defaultCurrency: 'USD' });
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createGroup.mutateAsync({ ...form, description: form.description || undefined });
      onClose();
    } catch {
      setError(t('admin.groupCreateFailed'));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('admin.addGroup')}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('groups.name')}</label>
            <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('groups.description')}</label>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('groups.defaultCurrency')}</label>
            <input type="text" maxLength={3} value={form.defaultCurrency} onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value.toUpperCase() }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">{t('expense.cancel')}</button>
            <button type="submit" disabled={createGroup.isPending} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {createGroup.isPending ? t('admin.creating') : t('admin.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GroupRow({ group }: { group: GroupAdminDTO }) {
  const { t } = useTranslation();
  const freeze = useAdminFreezeGroup();
  const deleteGroup = useAdminDeleteGroup();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const date = new Date(group.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50">
        <td className="px-4 py-3 text-sm text-slate-900 font-medium">
          {group.name}
          {group.frozen && (
            <span className="ms-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
              {t('admin.frozen')}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-500">{group.defaultCurrency}</td>
        <td className="px-4 py-3 text-sm text-slate-500">{group.memberCount}</td>
        <td className="px-4 py-3 text-sm text-slate-500">{group.expenseCount}</td>
        <td className="px-4 py-3 text-xs text-slate-400">{date}</td>
        <td className="px-4 py-3 text-end">
          <div className="flex items-center justify-end gap-2">
            <button
              disabled={freeze.isPending}
              onClick={() => freeze.mutate({ groupId: group.id, freeze: !group.frozen })}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-40 ${group.frozen ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}
            >
              {group.frozen ? t('admin.unfreeze') : t('admin.freeze')}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs px-3 py-1 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              {t('admin.deleteGroup')}
            </button>
          </div>
        </td>
      </tr>
      {confirmDelete && (
        <tr>
          <td colSpan={6} className="px-4 pb-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-4">
              <p className="text-sm text-red-700">{t('admin.confirmDeleteGroup', { name: group.name })}</p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">{t('expense.cancel')}</button>
                <button
                  disabled={deleteGroup.isPending}
                  onClick={() => deleteGroup.mutate(group.id)}
                  className="text-xs px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteGroup.isPending ? '…' : t('admin.deleteGroup')}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type AdminTab = 'users' | 'groups';

export function AdminPage() {
  const { t } = useTranslation();
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const { data: groups, isLoading: groupsLoading } = useAdminGroups();
  const sendReport = useSendBalanceReport();
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [reportResult, setReportResult] = useState<{ sent: number; errors: number; reason?: string } | null>(null);

  async function handleSendReport() {
    setReportResult(null);
    try {
      const result = await sendReport.mutateAsync();
      setReportResult(result);
    } catch {
      setReportResult({ sent: 0, errors: 1 });
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t('admin.title')}</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleSendReport}
            disabled={sendReport.isPending}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
          >
            {sendReport.isPending ? t('admin.sending') : `📧 ${t('admin.sendReport')}`}
          </button>
          {activeTab === 'users' && (
            <button onClick={() => setShowUserModal(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              + {t('admin.addUser')}
            </button>
          )}
          {activeTab === 'groups' && (
            <button onClick={() => setShowGroupModal(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              + {t('admin.addGroup')}
            </button>
          )}
        </div>
      </div>

      {reportResult && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          reportResult.reason === 'SMTP_NOT_CONFIGURED'
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : reportResult.errors > 0
              ? 'bg-red-50 text-red-700 border border-red-200'
              : reportResult.reason === 'NO_OPEN_BALANCES'
                ? 'bg-slate-50 text-slate-600 border border-slate-200'
                : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {reportResult.reason === 'SMTP_NOT_CONFIGURED'
            ? t('admin.reportSmtpMissing')
            : reportResult.reason === 'NO_OPEN_BALANCES'
              ? t('admin.reportNoBalances')
              : t('admin.reportSent', { sent: reportResult.sent, errors: reportResult.errors })}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['users', 'groups'] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t(`admin.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
          </button>
        ))}
      </div>

      {/* Users table */}
      {activeTab === 'users' && (
        <>
          {usersLoading && <p className="text-slate-400 text-sm">{t('common.loading')}</p>}
          {!usersLoading && users && (
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
        </>
      )}

      {/* Groups table */}
      {activeTab === 'groups' && (
        <>
          {groupsLoading && <p className="text-slate-400 text-sm">{t('common.loading')}</p>}
          {!groupsLoading && groups && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-start">{t('admin.name')}</th>
                    <th className="px-4 py-3 text-start">{t('groups.defaultCurrency')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.members')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.expenses')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.createdAt')}</th>
                    <th className="px-4 py-3 text-end"></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => <GroupRow key={g.id} group={g} />)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showUserModal && <AddUserModal onClose={() => setShowUserModal(false)} />}
      {showGroupModal && <AddGroupModal onClose={() => setShowGroupModal(false)} />}
    </div>
  );
}
