import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-900", children: _jsxs("div", { className: "w-full max-w-sm p-8 bg-slate-800 rounded-2xl", children: [_jsx("h1", { className: "text-xl font-bold text-center mb-2", children: "\u05E9\u05D7\u05D6\u05D5\u05E8 \u05E1\u05D9\u05E1\u05DE\u05D4" }), sent ? (_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-green-400 mb-4", children: "\u2713 \u05E9\u05DC\u05D7\u05E0\u05D5 \u05DC\u05DA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E2\u05DD \u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0\u05D9\u05E4\u05D5\u05E1" }), _jsx(Link, { to: "/login", className: "text-blue-400 hover:underline text-sm", children: "\u05D7\u05D6\u05E8\u05D4 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA" })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-slate-400 text-sm mb-6", children: "\u05D4\u05DB\u05E0\u05E1 \u05D0\u05EA \u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E9\u05DC\u05DA \u05D5\u05E0\u05E9\u05DC\u05D7 \u05DC\u05DA \u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0\u05D9\u05E4\u05D5\u05E1 \u05D4\u05E1\u05D9\u05E1\u05DE\u05D4" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "\u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E9\u05DC\u05DA", required: true, className: "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500" }), _jsx("button", { type: "submit", disabled: loading, className: "w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors", children: loading ? 'שולח...' : 'שלח קישור לאיפוס' })] }), _jsx("p", { className: "mt-4 text-center", children: _jsx(Link, { to: "/login", className: "text-slate-400 text-sm hover:underline", children: "\u05D7\u05D6\u05E8\u05D4 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA" }) })] }))] }) }));
}
