import { Link } from 'react-router-dom';
import type { GroupWithMembers } from '@split/shared';

interface Props {
  group: GroupWithMembers;
}

export function GroupCard({ group }: Props) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="block rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 mb-3">
        {group.imageUrl ? (
          <img src={group.imageUrl} alt={group.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
            {group.name[0].toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-card-foreground">{group.name}</h3>
          <p className="text-xs text-muted-foreground">{group.members.length} members · {group.defaultCurrency}</p>
        </div>
      </div>
      {group.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
      )}
    </Link>
  );
}
