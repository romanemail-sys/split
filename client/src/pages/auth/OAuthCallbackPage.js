import { jsx as _jsx } from "react/jsx-runtime";
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
        if (!token) {
            navigate('/login');
            return;
        }
        setAccessToken(token);
        api.get('/auth/me')
            .then(({ data }) => {
            setAuth(data, token);
            navigate('/dashboard');
        })
            .catch(() => navigate('/login'));
    }, []);
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-900", children: _jsx("p", { className: "text-slate-400", children: "\u05DE\u05EA\u05D7\u05D1\u05E8..." }) }));
}
