import { useEffect, useState } from 'react';
import axios from 'axios';
import { api, setAccessToken } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const refreshUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api/auth/refresh`
      : '/api/auth/refresh';

    const timeout = setTimeout(() => setReady(true), 5000);

    axios
      .post(refreshUrl, {}, { withCredentials: true, timeout: 8000 })
      .then(async ({ data }) => {
        setAccessToken(data.accessToken);
        const { data: me } = await api.get('/auth/me');
        setAuth(me, data.accessToken);
      })
      .catch(() => {
        // No valid session — user will be sent to login by ProtectedRoute
      })
      .finally(() => {
        clearTimeout(timeout);
        setReady(true);
      });
  }, [setAuth]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
