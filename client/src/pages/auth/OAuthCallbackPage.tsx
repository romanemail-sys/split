import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { setAccessToken } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = params.get('token');
    if (!token) { navigate('/login'); return; }

    setAccessToken(token);
    api.get('/auth/me')
      .then(({ data }) => {
        setAuth(data, token);
        navigate('/dashboard');
      })
      .catch(() => navigate('/login'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-slate-400">מתחבר...</p>
    </div>
  );
}
