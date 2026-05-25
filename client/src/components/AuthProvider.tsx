import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../lib/api';

/**
 * Restores auth session on app load by hitting /auth/refresh with the
 * httpOnly cookie. Shows nothing until the check completes so ProtectedRoute
 * never sees a false-negative "no user" flash.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const refreshUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api/auth/refresh`
      : '/api/auth/refresh';

    axios
      .post(refreshUrl, {}, { withCredentials: true })
      .then(async ({ data }) => {
        // Restore access token then fetch full user profile
        const { setAccessToken } = await import('../lib/api');
        setAccessToken(data.accessToken);
        const { data: me } = await api.get('/auth/me');
        setAuth(me, data.accessToken);
      })
      .catch(() => {
        // No valid refresh cookie — user needs to log in, that's fine
      })
      .finally(() => setReady(true));
  }, [setAuth]);

  if (!ready) return null; // blank while checking — prevents redirect flash

  return <>{children}</>;
}
