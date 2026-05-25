import { jsx as _jsx } from "react/jsx-runtime";
export function Label({ className = '', ...props }) {
    return (_jsx("label", { className: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`, ...props }));
}
