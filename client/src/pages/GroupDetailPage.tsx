import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGroup, useGroupBalances, useGroupActivity,
  useSettleMembers, useInviteMember, useRemoveMember, useInviteCandidates,
} from '../hooks/useGroups';
import { useExpenses } from '../hooks/useExpenses';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { CurrencySelect } from '../components/CurrencySelect';
import { useCurrencyRate } from '../hooks/useCurrencyRate';
import { DebtVisualization } from '../components/DebtVisualization';

type Tab = 'expenses' | 'members' | 'balances' | 'history';

// Bit (ביט) and Paybox payment app links
function PayLinks({ amount, currency }: { amount: number; currency: string }) {
  const { t } = useTranslation();
  const label = `${amount.toFixed(2)} ${currency}`;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-slate-400">{t('groupDetail.payWith')}:</span>
      <a
        href={`https://www.bitpay.co.il/app/pay?amount=${amount}`}
        target="_blank"
        rel="noopener noreferrer"
        title={`Bit – ${label}`}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7B2FBE] text-white font-semibold hover:opacity-80 transition-opacity"
      >
        ביט
      </a>
      <a
        href="https://payboxapp.page.link/pay"
        target="_blank"
        rel="noopener noreferrer"
        title={`Paybox – ${label}`}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5A623] text-white font-semibold hover:opacity-80 transition-opacity"
      >
        Paybox
      </a>
    </div>
  );
}

function activityIcon(type: string) {
  if (type === 'EXPENSE_CREATED') return '🧾';
  if (type === 'SPLIT_SETTLED') return '✅';
  if (type === 'MEMBER_JOINED') return '👤';
  return '•';
}

export function GroupDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const { data: group, isLoading } = useGroup(id);
  const { data: balances } = useGroupBalances(id);
  const { data: activity } = useGroupActivity(id);
  const settleMembers = useSettleMembers(id);
  const { data: expensesPage } = useExpenses(id);
  const inviteMember = useInviteMember(id);
  const removeMember = useRemoveMember(id);
  const currentUserId = useAuthStore((s: { user: { id: string } | null }) => s.user?.id);
  const [tab, setTab] = useState<Tab>('expenses');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const { data: inviteCandidates = [] } = useInviteCandidates(id, inviteSearch);
  const [viewCurrency, setViewCurrency] = useState('');

  // Must be unconditional — called before early returns
  const { data: convRate } = useCurrencyRate(group?.defaultCurrency ?? '', viewCurrency);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    const email = selectedUser ? selectedUser.email : inviteSearch.trim();
    if (!email) return;
    try {
      await inviteMember.mutateAsync({ email });
      setInviteOpen(false);
      setInviteSearch('');
      setSelectedUser(null);
    } catch {
      setInviteError(t('groupDetail.inviteFailed'));
    }
  }

  function handleInviteSelect(user: { id: string; name: string; email: string }) {
    setSelectedUser(user);
    setInviteSearch(user.name);
    setShowDropdown(false);
  }

  function handleInviteSearchChange(val: string) {
    setInviteSearch(val);
    setSelectedUser(null);
    setShowDropdown(true);
  }

  function handleInviteClose(open: boolean) {
    setInviteOpen(open);
    if (!open) { setInviteSearch(''); setSelectedUser(null); setInviteError(''); setShowDropdown(false); }
  }

  if (isLoading) return <div className="p-6 text-slate-400">{t('groupDetail.loading')}</div>;
  if (!group) return <div className="p-6 text-red-600">{t('groupDetail.notFound')}</div>;

  if (!viewCurrency && group.defaultCurrency) setViewCurrency(group.defaultCurrency);

  const isAdmin = group.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';
  const TABS: Tab[] = ['expenses', 'members', 'balances', 'history'];

  const rate = convRate?.rate ?? 1;
  const displayCurrency = viewCurrency || group.defaultCurrency;
  const showConversion = viewCurrency && viewCurrency !== group.defaultCurrency;

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

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto flex-1">
          {TABS.map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === tabKey
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {t(`groupDetail.tabs.${tabKey}`)}
            </button>
          ))}
        </div>
        <div className="w-40 shrink-0">
          <CurrencySelect value={viewCurrency} onChange={setViewCurrency} />
        </div>
      </div>

      {/* ── EXPENSES ── */}
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
              {expensesPage?.expenses.map((expense) => {
                const allSettled = expense.splits.length > 0 && expense.splits.every((s) => s.isSettled);
                return (
                  <Link
                    key={expense.id}
                    to={`/expenses/${expense.id}`}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      allSettled
                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${allSettled ? 'text-income' : 'text-slate-900'}`}>
                          {expense.description}
                        </p>
                        {allSettled && (
                          <span className="text-xs bg-green-100 text-income px-2 py-0.5 rounded-full">
                            {t('expense.settled')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {t('groupDetail.paidBy', { name: expense.paidBy.name })} · {expense.date}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className={`font-semibold ${allSettled ? 'text-income' : 'text-expense'}`}>
                        {(expense.amountBase * rate).toFixed(2)} {displayCurrency}
                      </p>
                      {showConversion && (
                        <p className="text-xs text-slate-400">
                          {expense.amount.toFixed(2)} {expense.currency}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MEMBERS ── */}
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

          <Dialog open={inviteOpen} onOpenChange={handleInviteClose}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('groupDetail.inviteMember')}</DialogTitle></DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="invite-search">{t('groupDetail.email')}</Label>
                  <div className="relative">
                    <Input
                      id="invite-search"
                      autoComplete="off"
                      value={inviteSearch}
                      onChange={(e) => handleInviteSearchChange(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                      placeholder={t('groupDetail.invitePlaceholder')}
                    />
                    {showDropdown && inviteCandidates.length > 0 && (
                      <ul className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                        {inviteCandidates.map((u) => (
                          <li
                            key={u.id}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                            onMouseDown={(e) => { e.preventDefault(); handleInviteSelect(u); }}
                          >
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                              {u.name[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                              <p className="text-xs text-slate-500 truncate">{u.email}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {selectedUser && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <span>✓</span> {selectedUser.email}
                    </p>
                  )}
                </div>
                {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleInviteClose(false)}>{t('expense.cancel')}</Button>
                  <Button type="submit" disabled={inviteMember.isPending || (!selectedUser && !inviteSearch.trim())}>
                    {inviteMember.isPending ? t('groupDetail.inviting') : t('groupDetail.invite')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── BALANCES ── */}
      {tab === 'balances' && (
        <div>
          {!balances?.length ? (
            <p className="text-center text-slate-400 py-8">{t('groupDetail.noBalances')}</p>
          ) : (
            <>
              <div className="space-y-3">
                {balances.map((b, i) => {
                  const converted = b.amount * rate;
                  const canSettle =
                    b.fromUserId === currentUserId ||
                    b.toUserId === currentUserId ||
                    isAdmin;
                  return (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-slate-900">{b.fromName}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-medium text-slate-900">{b.toName}</span>
                        </div>
                        <div className="text-end">
                          <p className="font-semibold text-expense">
                            {converted.toFixed(2)} {displayCurrency}
                          </p>
                          {showConversion && (
                            <p className="text-xs text-slate-400">
                              {b.amount.toFixed(2)} {b.currency}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <PayLinks amount={converted} currency={displayCurrency} />
                        {canSettle && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={settleMembers.isPending}
                            onClick={() => settleMembers.mutate({ fromUserId: b.fromUserId, toUserId: b.toUserId })}
                          >
                            {t('groupDetail.settleUp')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <DebtVisualization
                balances={balances}
                members={group.members}
                currency={displayCurrency}
                rate={rate}
              />
            </>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === 'history' && (
        <div>
          {!activity?.length ? (
            <p className="text-center text-slate-400 py-8">{t('groupDetail.noHistory')}</p>
          ) : (
            <div className="space-y-1">
              {activity.map((item) => {
                let text = '';
                if (item.type === 'EXPENSE_CREATED') {
                  text = t('groupDetail.activityExpenseCreated', { description: item.description });
                } else if (item.type === 'SPLIT_SETTLED') {
                  text = t('groupDetail.activitySplitSettled', { description: item.description });
                } else if (item.type === 'MEMBER_JOINED') {
                  text = t('groupDetail.activityMemberJoined');
                }
                const dateStr = new Date(item.date).toLocaleDateString(undefined, {
                  day: '2-digit', month: 'short', year: 'numeric',
                });
                const timeStr = new Date(item.date).toLocaleTimeString(undefined, {
                  hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
                    <span className="text-lg leading-none mt-0.5">{activityIcon(item.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{item.actorName}</span>{' '}{text}
                        {item.amount != null && item.currency && (
                          <span className="ms-1 font-semibold text-expense">
                            {item.amount.toFixed(2)} {item.currency}
                          </span>
                        )}
                      </p>
                      {item.expenseId && (
                        <Link to={`/expenses/${item.expenseId}`} className="text-xs text-blue-500 hover:underline">
                          {item.description}
                        </Link>
                      )}
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
      )}
    </div>
  );
}
