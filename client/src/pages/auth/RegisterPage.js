import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useRegister } from '../../hooks/useAuth';
export default function RegisterPage() {
    const navigate = useNavigate();
    const register = useRegister();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await register.mutateAsync({ name, email, password });
            navigate('/dashboard');
        }
        catch { }
    }
    const errorMsg = (() => {
        if (axios.isAxiosError(register.error) && register.error.response?.data?.error?.code === 'EMAIL_IN_USE')
            return 'האימייל כבר רשום במערכת';
        if (register.isError)
            return 'שגיאה בהרשמה, נסה שוב';
        return null;
    })();
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-900", children: _jsxs("div", { className: "w-full max-w-sm p-8 bg-slate-800 rounded-2xl", children: [_jsx("h1", { className: "text-2xl font-bold text-center mb-2", children: "\uD83D\uDCB8 Split" }), _jsx("p", { className: "text-slate-400 text-center mb-8", children: "\u05E6\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05DF \u05D7\u05D3\u05E9" }), errorMsg && (_jsx("div", { className: "mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400 text-sm", children: errorMsg })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-slate-300 mb-1", children: "\u05E9\u05DD \u05DE\u05DC\u05D0" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), required: true, className: "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-slate-300 mb-1", children: "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, className: "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-slate-300 mb-1", children: "\u05E1\u05D9\u05E1\u05DE\u05D4 (\u05DC\u05E4\u05D7\u05D5\u05EA 6 \u05EA\u05D5\u05D5\u05D9\u05DD)" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, minLength: 6, className: "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500" })] }), _jsx("button", { type: "submit", disabled: register.isPending, className: "w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors", children: register.isPending ? 'נרשם...' : 'הירשם' })] }), _jsxs("p", { className: "mt-6 text-center text-slate-400 text-sm", children: ["\u05DB\u05D1\u05E8 \u05D9\u05E9 \u05DC\u05DA \u05D7\u05E9\u05D1\u05D5\u05DF?", ' ', _jsx(Link, { to: "/login", className: "text-blue-400 hover:underline", children: "\u05D4\u05EA\u05D7\u05D1\u05E8" })] })] }) }));
}
