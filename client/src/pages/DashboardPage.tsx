import { useAuthStore } from '../stores/auth.store';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">שלום, {user?.name} 👋</h1>
      <p className="text-slate-400">הדאשבורד יהיה כאן בקרוב.</p>
    </div>
  );
}
