import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupDetailPage } from './pages/GroupDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="groups/:id" element={<GroupDetailPage />} />
          <Route path="expenses" element={<div className="text-slate-400">Expenses — Plan 2</div>} />
          <Route path="analytics" element={<div className="text-slate-400">Analytics — Plan 4</div>} />
          <Route path="notifications" element={<div className="text-slate-400">Notifications — Plan 4</div>} />
        </Route>
        <Route path="*" element={
  <div className="min-h-screen flex items-center justify-center bg-slate-900">
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-slate-400 mb-4">הדף לא נמצא</p>
      <a href="/dashboard" className="text-blue-400 hover:underline">חזרה הביתה</a>
    </div>
  </div>
} />
      </Routes>
    </BrowserRouter>
  );
}
