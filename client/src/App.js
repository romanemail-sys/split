import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { ExpenseFormPage } from './pages/expenses/ExpenseFormPage';
import { ExpenseDetailPage } from './pages/expenses/ExpenseDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminPage } from './pages/admin/AdminPage';
function NotFoundPage() {
    const { t } = useTranslation();
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-900", children: _jsxs("div", { className: "text-center text-white", children: [_jsx("h1", { className: "text-4xl font-bold mb-2", children: t('common.notFound') }), _jsx("p", { className: "text-slate-400 mb-4", children: t('common.notFoundMsg') }), _jsx("a", { href: "/dashboard", className: "text-blue-400 hover:underline", children: t('common.backHome') })] }) }));
}
export default function App() {
    return (_jsx(HashRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsx(Route, { path: "/forgot-password", element: _jsx(ForgotPasswordPage, {}) }), _jsx(Route, { path: "/reset-password", element: _jsx(ResetPasswordPage, {}) }), _jsx(Route, { path: "/auth/callback", element: _jsx(OAuthCallbackPage, {}) }), _jsxs(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(AppLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), _jsx(Route, { path: "dashboard", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "groups", element: _jsx(GroupsPage, {}) }), _jsx(Route, { path: "groups/:id", element: _jsx(GroupDetailPage, {}) }), _jsx(Route, { path: "expenses", element: _jsx(ExpensesPage, {}) }), _jsx(Route, { path: "expenses/new", element: _jsx(ExpenseFormPage, {}) }), _jsx(Route, { path: "expenses/:id", element: _jsx(ExpenseDetailPage, {}) }), _jsx(Route, { path: "expenses/:id/edit", element: _jsx(ExpenseFormPage, {}) }), _jsx(Route, { path: "analytics", element: _jsx(AnalyticsPage, {}) }), _jsx(Route, { path: "notifications", element: _jsx(NotificationsPage, {}) }), _jsx(Route, { path: "admin", element: _jsx(AdminRoute, { children: _jsx(AdminPage, {}) }) })] }), _jsx(Route, { path: "*", element: _jsx(NotFoundPage, {}) })] }) }));
}
