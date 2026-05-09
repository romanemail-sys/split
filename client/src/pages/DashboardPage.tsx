import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth.store';

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">{t('dashboard.greeting', { name: user?.name })}</h1>
      <p className="text-slate-500">{t('dashboard.comingSoon')}</p>
    </div>
  );
}
