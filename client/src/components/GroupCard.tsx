import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GroupWithMembers } from '@split/shared';

interface Props {
  group: GroupWithMembers;
}

export function GroupCard({ group }: Props) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/groups/${group.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 mb-3">
        {group.imageUrl ? (
          <img src={group.imageUrl} alt={group.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
            {group.name[0].toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-slate-900">{group.name}</h3>
          <p className="text-xs text-slate-500">
            {t('groups.members_other', { count: group.members.length })} · {group.defaultCurrency}
          </p>
        </div>
      </div>
      {group.description && (
        <p className="text-sm text-slate-500 line-clamp-2">{group.description}</p>
      )}
    </Link>
  );
}
