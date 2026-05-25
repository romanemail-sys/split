import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export function Dialog({ open, onOpenChange, children }) {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape')
                onOpenChange(false);
        };
        if (open)
            document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onOpenChange]);
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [_jsx("div", { className: "fixed inset-0 bg-black/50", onClick: () => onOpenChange(false) }), _jsx("div", { className: "relative z-50 w-full max-w-lg", children: children })] }));
}
export function DialogContent({ children, className = '' }) {
    return (_jsx("div", { className: `bg-card rounded-lg shadow-lg p-6 mx-4 ${className}`, children: children }));
}
export function DialogHeader({ children }) {
    return _jsx("div", { className: "mb-4", children: children });
}
export function DialogTitle({ children }) {
    return _jsx("h2", { className: "text-lg font-semibold text-card-foreground", children: children });
}
export function DialogFooter({ children }) {
    return _jsx("div", { className: "flex justify-end gap-2 mt-4", children: children });
}
