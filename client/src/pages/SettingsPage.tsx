import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChangePassword } from '../hooks/useSettings';
import { useAuthStore } from '../stores/auth.store';

export function SettingsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const changePassword = useChangePassword();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isOAuthOnly = !!(user && !user.email); // fallback: hide form for google-only if needed
  // We detect OAuth-only by checking if the mutation returns NO_PASSWORD
  const hasPassword = true; // optimistic; server returns error if OAuth-only

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (next !== confirm) {
      setError(t('settings.passwordMismatch'));
      return;
    }
    if (next.length < 6) {
      setError(t('settings.passwordTooShort'));
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
      setSuccess(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: { code?: string } } } };
        const code = axiosErr.response?.data?.error?.code;
        if (code === 'WRONG_PASSWORD') { setError(t('settings.wrongPassword')); return; }
        if (code === 'NO_PASSWORD') { setError(t('settings.noPasswordAccount')); return; }
      }
      setError(t('settings.changeFailed'));
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('settings.title')}</h1>

      {/* Profile section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <p className="font-semibold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">{t('settings.changePassword')}</h2>

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3">
            {t('settings.passwordChanged')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">{t('settings.currentPassword')}</label>
            <input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">{t('settings.newPassword')}</label>
            <input
              type="password"
              required
              minLength={6}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">{t('settings.confirmPassword')}</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={changePassword.isPending}
            className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
          >
            {changePassword.isPending ? t('settings.saving') : t('settings.savePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
