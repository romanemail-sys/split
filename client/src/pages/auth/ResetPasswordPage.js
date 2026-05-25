import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
export default function ResetPasswordPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const token = params.get('token') ?? '';
    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/reset-password', { token, password });
            navigate('/login?reset=1');
        }
        catch {
            setError('הקישור לא תקף או שפג תוקפו');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-900", children: _jsxs("div", { className: "w-full max-w-sm p-8 bg-slate-800 rounded-2xl", children: [_jsx("h1", { className: "text-xl font-bold text-center mb-6", children: "\u05D1\u05D7\u05E8 \u05E1\u05D9\u05E1\u05DE\u05D4 \u05D7\u05D3\u05E9\u05D4" }), error && (_jsx("div", { className: "mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400 text-sm", children: error })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u05E1\u05D9\u05E1\u05DE\u05D4 \u05D7\u05D3\u05E9\u05D4 (\u05DC\u05E4\u05D7\u05D5\u05EA 6 \u05EA\u05D5\u05D5\u05D9\u05DD)", required: true, minLength: 6, className: "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500" }), _jsx("button", { type: "submit", disabled: loading, className: "w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors", children: loading ? 'שומר...' : 'שמור סיסמה' })] })] }) }));
}
