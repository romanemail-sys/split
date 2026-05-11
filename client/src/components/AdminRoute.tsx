import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
