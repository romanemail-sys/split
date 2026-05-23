import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUserActivity } from '../hooks/useMe';

function icon(type: string) {
  if (type === 'EXPENSE_CREATED') return '🧾';
  if (type === 'SPLIT_SETTLED') return '✅';
  return '👤';
}

export function NotificationsPage() {
  const { t } = useTranslation();
  const { data: activity, isLoading } = useUserActivity();

  if (isLoading) return <div className="p-6 text-slate-400">{t('common.loading')}</div>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('notifications.title')}</h1>

      {!activity?.length ? (
        <p className="text-slate-400">{t('notifications.noActivity')}</p>
      ) : (
        <div className="space-y-0 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
          {activity.map((item) => {
            let text = '';
            if (item.type === 'EXPENSE_CREATED') {
              text = t('notifications.activityExpenseCreated', { description: item.description });
            } else if (item.type === 'SPLIT_SETTLED') {
              text = t('notifications.activitySplitSettled', { description: item.description });
            } else {
              text = t('notifications.activityMemberJoined', { groupName: item.groupName ?? '' });
            }

            const dateStr = new Date(item.date).toLocaleDateString(undefined, {
              day: '2-digit', month: 'short',
            });
            const timeStr = new Date(item.date).toLocaleTimeString(undefined, {
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <span className="text-xl leading-none mt-0.5 shrink-0">{icon(item.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">{item.actorName}</span>{' '}{text}
                    {item.amount != null && item.currency && (
                      <span className="ms-1 font-semibold text-expense">
                        {item.amount.toFixed(2)} {item.currency}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.groupName && (
                      <Link
                        to={item.groupId ? `/groups/${item.groupId}` : '#'}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        {item.groupName}
                      </Link>
                    )}
                    {item.expenseId && item.type !== 'MEMBER_JOINED' && (
                      <>
                        <span className="text-slate-300">·</span>
                        <Link to={`/expenses/${item.expenseId}`} className="text-xs text-slate-400 hover:underline">
                          {item.description}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs text-slate-500">{dateStr}</p>
                  <p className="text-xs text-slate-400">{timeStr}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
