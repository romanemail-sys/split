import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLookupGroup, useJoinGroup } from '../hooks/useGroups';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

function GroupPreviewCard({
  group,
  onJoin,
  joining,
}: {
  group: { id: string; name: string; description: string | null; defaultCurrency: string; memberCount: number };
  onJoin: () => void;
  joining: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
          {group.name[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{group.name}</p>
          <p className="text-xs text-slate-500">
            {group.memberCount} {t('join.members')} · {group.defaultCurrency}
          </p>
          {group.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{group.description}</p>}
        </div>
      </div>
      <Button size="sm" onClick={onJoin} disabled={joining}>
        {joining ? t('join.joining') : t('join.join')}
      </Button>
    </div>
  );
}

export function JoinGroupPage() {
  const { t } = useTranslation();
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState(code ?? '');
  const [searchQuery, setSearchQuery] = useState(code ?? '');
  const [joined, setJoined] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: results, isLoading } = useLookupGroup(searchQuery);
  const joinGroup = useJoinGroup();

  // Auto-search when arriving via invite link (/join/:code)
  useEffect(() => {
    if (code) { setQuery(code); setSearchQuery(code); }
  }, [code]);

  async function handleJoin(identifier: string, groupName: string) {
    setError('');
    try {
      await joinGroup.mutateAsync({ identifier });
      setJoined(groupName);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg === 'ALREADY_MEMBER' ? t('join.alreadyMember') : t('join.failed'));
    }
  }

  if (joined) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">{t('join.successTitle')}</h1>
        <p className="text-slate-500 mb-6">{t('join.successMsg', { name: joined })}</p>
        <Button onClick={() => navigate('/groups')}>{t('join.goToGroups')}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('join.title')}</h1>
      <p className="text-slate-500 text-sm mb-6">{t('join.subtitle')}</p>

      <div className="flex gap-2 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('join.placeholder')}
          onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(query)}
        />
        <Button onClick={() => setSearchQuery(query)} disabled={query.trim().length < 2}>
          {t('join.search')}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {isLoading && <p className="text-sm text-slate-400">{t('join.searching')}</p>}

      {results && results.length === 0 && searchQuery.length >= 2 && !isLoading && (
        <p className="text-sm text-slate-400 text-center py-6">{t('join.notFound')}</p>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((g) => (
            <GroupPreviewCard
              key={g.id}
              group={g}
              onJoin={() => handleJoin(g.inviteCode, g.name)}
              joining={joinGroup.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
