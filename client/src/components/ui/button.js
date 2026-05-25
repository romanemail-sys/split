import { jsx as _jsx } from "react/jsx-runtime";
export function Button({ variant = 'default', size = 'default', className = '', ...props }) {
    const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';
    const variants = {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    };
    const sizes = {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-8 text-base',
    };
    return (_jsx("button", { className: `${base} ${variants[variant]} ${sizes[size]} ${className}`, ...props }));
}
