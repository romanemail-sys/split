import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { api, setAccessToken } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
export function AuthProvider({ children }) {
    const [ready, setReady] = useState(false);
    const [slow, setSlow] = useState(false);
    const setAuth = useAuthStore((s) => s.setAuth);
    useEffect(() => {
        const refreshUrl = import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/api/auth/refresh`
            : '/api/auth/refresh';
        // Show "waking up…" hint after 4 s (Render free-tier cold start)
        const slowTimer = setTimeout(() => setSlow(true), 4000);
        // Safety-net: only fires if the axios request itself hangs (e.g. network
        // drops mid-request). Must be longer than the axios timeout below so the
        // .finally() path is always taken first on normal cold-starts.
        const timeout = setTimeout(() => setReady(true), 20000);
        axios
            .post(refreshUrl, {}, { withCredentials: true, timeout: 15000 })
            .then(async ({ data }) => {
            setAccessToken(data.accessToken);
            const { data: me } = await api.get('/auth/me');
            setAuth(me, data.accessToken);
        })
            .catch(() => {
            // No valid session — user will be sent to login by ProtectedRoute
        })
            .finally(() => {
            clearTimeout(slowTimer);
            clearTimeout(timeout);
            setReady(true);
        });
    }, [setAuth]);
    if (!ready) {
        return (_jsxs("div", { className: "min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3", children: [_jsx("div", { className: "w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" }), slow && (_jsx("p", { className: "text-slate-400 text-sm animate-pulse", children: "Waking up server\u2026" }))] }));
    }
    return _jsx(_Fragment, { children: children });
}
