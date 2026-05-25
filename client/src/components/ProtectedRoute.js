import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
export default function ProtectedRoute({ children }) {
    const user = useAuthStore((s) => s.user);
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
