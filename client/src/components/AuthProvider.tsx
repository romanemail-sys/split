import { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { api, setAccessToken } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

// Render free tier can take up to ~30 s to wake from cold start.
// We try twice: first attempt with a 12 s timeout, then after 4 s wait
// a second attempt with a 20 s timeout. Total ceiling: ~36 s.
const ATTEMPTS: { timeout: number; delay: number }[] = [
  { timeout: 12000, delay: 4000 },
  { timeout: 20000, delay: 0 },
];

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const refreshUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api/auth/refresh`
      : '/api/auth/refresh';

    let cancelled = false;

    // Show "waking up…" hint after 4 s so users know it's a cold start
    const slowTimer = setTimeout(() => setSlow(true), 4000);

    async function tryRefresh() {
      for (let i = 0; i < ATTEMPTS.length; i++) {
        if (cancelled) return;
        const { timeout, delay } = ATTEMPTS[i];
        try {
          const { data } = await axios.post(refreshUrl, {}, { withCredentials: true, timeout });
          if (cancelled) return;

          setAccessToken(data.accessToken);
          const { data: me } = await api.get('/auth/me');
          if (cancelled) return;

          setAuth(me, data.accessToken);
          return; // authenticated — done
        } catch (err) {
          if (cancelled) return;
          const axiosErr = err as AxiosError;

          // 401 from the refresh endpoint means the cookie is gone / expired.
          // Stop retrying — ProtectedRoute will redirect to login.
          if (axiosErr.response?.status === 401) return;

          // Any other error (timeout, network, 5xx) means the server is still
          // waking up. Wait and retry if we have attempts left.
          if (i < ATTEMPTS.length - 1 && delay > 0) {
            await sleep(delay);
          }
          // Fall through to next attempt
        }
      }
      // All attempts exhausted without a 401 — might be a persistent server
      // issue. Leave user = null; ProtectedRoute will redirect to login.
    }

    tryRefresh().finally(() => {
      if (!cancelled) {
        clearTimeout(slowTimer);
        setReady(true);
      }
    });

    // Cleanup for React StrictMode double-invoke
    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [setAuth]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        {slow && (
          <p className="text-slate-400 text-sm animate-pulse">Waking up server…</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
