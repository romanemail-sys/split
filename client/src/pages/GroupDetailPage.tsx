import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGroup, useGroupBalances, useInviteMember, useRemoveMember } from '../hooks/useGroups';
import { useExpenses } from '../hooks/useExpenses';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';

type Tab = 'expenses' | 'members' | 'balances';

function formatBalance(balance: number, currency: string) {
  const abs = Math.abs(balance).toFixed(2);
  if (balance > 0) return `+${abs} ${currency}`;
  if (balance < 0) return `-${abs} ${currency}`;
  return `0 ${currency}`;
}

export function GroupDetailPage() {
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
      setInviteError('Could not invite member. Check the email and try again.');
    }
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!group) return <div className="p-6 text-destructive">Group not found.</div>;

  const isAdmin = group.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
          {group.name[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.description && <p className="text-muted-foreground text-sm">{group.description}</p>}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b">
        {(['expenses', 'members', 'balances'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <div>
          <div className="flex justify-end mb-4">
            <Link
              to={`/expenses/new?groupId=${id}`}
              className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 text-sm"
            >
              Add Expense
            </Link>
          </div>
          {expensesPage?.expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No expenses yet.</p>
          ) : (
            <div className="space-y-2">
              {expensesPage?.expenses.map((expense) => (
                <Link
                  key={expense.id}
                  to={`/expenses/${expense.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Paid by {expense.paidBy.name} · {expense.date}
                    </p>
                  </div>
                  <span className="font-semibold">
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
              <Button onClick={() => setInviteOpen(true)}>Invite Member</Button>
            </div>
          )}
          <div className="space-y-2">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {m.user.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt={m.user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {m.user.name[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                  </div>
                </div>
                {isAdmin && m.userId !== currentUserId && (
                  <Button variant="ghost" size="sm" onClick={() => removeMember.mutate(m.userId)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? 'Inviting…' : 'Invite'}
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
            <p className="text-center text-muted-foreground py-8">No balances.</p>
          ) : (
            <div className="space-y-2">
              {balances.map((b) => (
                <div key={b.userId} className="flex items-center justify-between p-3 rounded-lg border">
                  <p className="font-medium">{b.name}</p>
                  <span className={`font-semibold ${b.balance > 0 ? 'text-green-600' : b.balance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
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
