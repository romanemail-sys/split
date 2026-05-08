import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm p-8 bg-slate-800 rounded-2xl">
        <h1 className="text-xl font-bold text-center mb-2">שחזור סיסמה</h1>

        {sent ? (
          <div className="text-center">
            <p className="text-green-400 mb-4">✓ שלחנו לך אימייל עם קישור לאיפוס</p>
            <Link to="/login" className="text-blue-400 hover:underline text-sm">חזרה להתחברות</Link>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-6">הכנס את האימייל שלך ונשלח לך קישור לאיפוס הסיסמה</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="האימייל שלך"
                required
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
              </button>
            </form>
            <p className="mt-4 text-center">
              <Link to="/login" className="text-slate-400 text-sm hover:underline">חזרה להתחברות</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
