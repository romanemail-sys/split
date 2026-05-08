import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../../hooks/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await register.mutateAsync({ name, email, password });
      navigate('/dashboard');
    } catch {}
  }

  const errorMsg = (() => {
    const err = register.error as { response?: { data?: { error?: { code?: string } } } } | null;
    if (err?.response?.data?.error?.code === 'EMAIL_IN_USE') return 'האימייל כבר רשום במערכת';
    if (register.isError) return 'שגיאה בהרשמה, נסה שוב';
    return null;
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm p-8 bg-slate-800 rounded-2xl">
        <h1 className="text-2xl font-bold text-center mb-2">💸 Split</h1>
        <p className="text-slate-400 text-center mb-8">צור חשבון חדש</p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">שם מלא</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">סיסמה (לפחות 6 תווים)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={register.isPending}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {register.isPending ? 'נרשם...' : 'הירשם'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          כבר יש לך חשבון?{' '}
          <Link to="/login" className="text-blue-400 hover:underline">התחבר</Link>
        </p>
      </div>
    </div>
  );
}
