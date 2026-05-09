import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGroup, useGroupBalances, useInviteMember, useRemoveMember } from '../hooks/useGroups';
import { useExpenses } from '../hooks/useExpenses';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

type Tab = 'expenses' | 'members' | 'balances';

function formatBalance(balance: number, currency: string) {
  const abs = Math.abs(balance).toFixed(2);
  if (balance > 0) return `+${abs} ${currency}`;
  if (balance < 0) return `-${abs} ${currency}`;
  return `0.00 ${currency}`;
}

export function GroupDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const { data: group, isLoading } = useGroup(id);
  const { data: balances } = useGroupBalances(id);
  const { data: expensesPage } = useExpenses(id);
  const inviteMember = useInviteMember(id);
  const removeMember = useRemoveMember(id);
  const currentUserId = useAuthStore((s: { user: { id: string } | null }) => s.user?.id);
  const [tab, setTab] = useState<Tab>('expenses');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    try {
      await inviteMember.mutateAsync({ email: inviteEmail });
      setInviteOpen(false);
      setInviteEmail('');
    } catch {
      setInviteError(t('groupDetail.inviteFailed'));
    }
  }

  if (isLoading) return <div className="p-6 text-slate-400">{t('groupDetail.loading')}</div>;
  if (!group) return <div className="p-6 text-red-600">{t('groupDetail.notFound')}</div>;

  const isAdmin = group.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';

  const TABS: Tab[] = ['expenses', 'members', 'balances'];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
          {group.name[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
          {group.description && <p className="text-slate-500 text-sm">{group.description}</p>}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tabKey
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t(`groupDetail.tabs.${tabKey}`)}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <div>
          <div className="flex justify-end mb-4">
            <Link
              to={`/expenses/new?groupId=${id}`}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {t('groupDetail.addExpense')}
            </Link>
          </div>
          {expensesPage?.expenses.length === 0 ? (
            <p className="text-center text-slate-400 py-8">{t('groupDetail.noExpenses')}</p>
          ) : (
            <div className="space-y-2">
              {expensesPage?.expenses.map((expense) => (
                <Link
                  key={expense.id}
                  to={`/expenses/${expense.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">{expense.description}</p>
                    <p className="text-sm text-slate-500">
                      {t('groupDetail.paidBy', { name: expense.paidBy.name })} · {expense.date}
                    </p>
                  </div>
                  <span className="font-semibold text-expense">
                    {expense.amount.toFixed(2)} {expense.currency}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div>
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Button onClick={() => setInviteOpen(true)}>{t('groupDetail.inviteMember')}</Button>
            </div>
          )}
          <div className="space-y-2">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  {m.user.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt={m.user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                      {m.user.name[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm text-slate-900">{m.user.name}</p>
                    <p className="text-xs text-slate-500">{m.role}</p>
                  </div>
                </div>
                {isAdmin && m.userId !== currentUserId && (
                  <Button variant="ghost" size="sm" onClick={() => removeMember.mutate(m.userId)}>
                    {t('groupDetail.remove')}
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('groupDetail.inviteMember')}</DialogTitle></DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="invite-email">{t('groupDetail.email')}</Label>
                  <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                </div>
                {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>{t('expense.cancel')}</Button>
                  <Button type="submit" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? t('groupDetail.inviting') : t('groupDetail.invite')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {tab === 'balances' && (
        <div>
          {!balances?.length ? (
            <p className="text-center text-slate-400 py-8">{t('groupDetail.noBalances')}</p>
          ) : (
            <div className="space-y-2">
              {balances.map((b) => (
                <div key={b.userId} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                  <p className="font-medium text-slate-900">{b.name}</p>
                  <span className={`font-semibold ${b.balance > 0 ? 'text-income' : b.balance < 0 ? 'text-expense' : 'text-slate-500'}`}>
                    {formatBalance(b.balance, group.defaultCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
