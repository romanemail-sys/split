import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Select({ className = '', placeholder, children, ...props }) {
    return (_jsxs("select", { className: `w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${className}`, ...props, children: [placeholder && _jsx("option", { value: "", disabled: true, children: placeholder }), children] }));
}
