import { useTranslation } from 'react-i18next';
import type { SplitType, SplitInput, GroupMember } from '@split/shared';
import { Input } from '../ui/input';

interface Props {
  splitType: SplitType;
  members: GroupMember[];
  splits: SplitInput[];
  onChange: (splits: SplitInput[]) => void;
  amount?: number;
  currency?: string;
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
}

export function SplitEditor({ splitType, members, splits, onChange, amount, currency }: Props) {
  const { t } = useTranslation();

  function updateSplit(userId: string, patch: Partial<SplitInput>) {
    onChange(splits.map((s) => (s.userId === userId ? { ...s, ...patch } : s)));
  }

  // Only show rows for selected members (those present in splits)
  const activeSplits = splits.filter((s) => members.some((m) => m.userId === s.userId));

  if (splitType === 'EQUAL') {
    const perPerson = amount && members.length > 0 ? amount / members.length : null;
    return (
      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                {initials(m.user.name)}
              </div>
              <span className="text-sm font-medium text-slate-900">{m.user.name}</span>
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {perPerson != null && currency ? `${perPerson.toFixed(2)} ${currency}` : '—'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (splitType === 'EXACT') {
    const total = activeSplits.reduce((s, sp) => s + (sp.amount ?? 0), 0);
    const remaining = (amount ?? 0) - total;
    const valid = Math.abs(remaining) < 0.01;
    return (
      <div className="space-y-2">
        {activeSplits.map((split) => {
          const member = members.find((m) => m.userId === split.userId);
          if (!member) return null;
          return (
            <div key={split.userId} className="flex items-center gap-3">
              <div className="w-7 h-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                {initials(member.user.name)}
              </div>
              <span className="flex-1 text-sm text-slate-900 truncate">{member.user.name}</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={split.amount || ''}
                onChange={(e) => updateSplit(split.userId, { amount: parseFloat(e.target.value) || 0 })}
                className="w-28 text-end"
              />
              {currency && <span className="text-xs text-slate-500 w-8">{currency}</span>}
            </div>
          );
        })}
        {amount != null && amount > 0 && (
          <div className={`flex justify-between text-xs mt-1 px-1 ${valid ? 'text-income' : remaining > 0 ? 'text-slate-500' : 'text-expense'}`}>
            <span>{t('expense.totalAssigned')}: {total.toFixed(2)}</span>
            <span>{valid ? '✓' : `${remaining > 0 ? '+' : ''}${remaining.toFixed(2)} ${currency ?? ''}`}</span>
          </div>
        )}
      </div>
    );
  }

  if (splitType === 'PERCENTAGE') {
    const total = activeSplits.reduce((s, sp) => s + (sp.percentage ?? 0), 0);
    const remaining = 100 - total;
    const valid = Math.abs(remaining) < 0.1;
    return (
      <div className="space-y-2">
        {activeSplits.map((split) => {
          const member = members.find((m) => m.userId === split.userId);
          if (!member) return null;
          const pct = split.percentage ?? 0;
          const share = amount ? (amount * pct / 100) : null;
          return (
            <div key={split.userId} className="flex items-center gap-3">
              <div className="w-7 h-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                {initials(member.user.name)}
              </div>
              <span className="flex-1 text-sm text-slate-900 truncate">{member.user.name}</span>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="0"
                value={pct || ''}
                onChange={(e) => updateSplit(split.userId, { percentage: parseFloat(e.target.value) || 0 })}
                className="w-20 text-end"
              />
              <span className="text-xs text-slate-500 w-4">%</span>
              {share != null && currency && (
                <span className="text-xs text-slate-400 w-20 text-end">{share.toFixed(2)} {currency}</span>
              )}
            </div>
          );
        })}
        <div className={`flex justify-between text-xs mt-1 px-1 ${valid ? 'text-income' : remaining > 0 ? 'text-slate-500' : 'text-expense'}`}>
          <span>{t('expense.totalAssigned')}: {total.toFixed(1)}%</span>
          <span>{valid ? '✓' : `${remaining > 0 ? '+' : ''}${remaining.toFixed(1)}%`}</span>
        </div>
      </div>
    );
  }

  // SHARES
  const totalShares = activeSplits.reduce((s, sp) => s + (sp.shares ?? 1), 0);
  return (
    <div className="space-y-2">
      {activeSplits.map((split) => {
        const member = members.find((m) => m.userId === split.userId);
        if (!member) return null;
        const sh = split.shares ?? 1;
        const share = amount && totalShares > 0 ? (amount * sh / totalShares) : null;
        return (
          <div key={split.userId} className="flex items-center gap-3">
            <div className="w-7 h-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
              {initials(member.user.name)}
            </div>
            <span className="flex-1 text-sm text-slate-900 truncate">{member.user.name}</span>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="1"
              value={sh}
              onChange={(e) => updateSplit(split.userId, { shares: parseInt(e.target.value) || 1 })}
              className="w-20 text-end"
            />
            <span className="text-xs text-slate-500 w-10">{t('expense.shares')}</span>
            {share != null && currency && (
              <span className="text-xs text-slate-400 w-20 text-end">{share.toFixed(2)} {currency}</span>
            )}
          </div>
        );
      })}
      {totalShares > 0 && (
        <p className="text-xs text-slate-400 px-1">{t('expense.totalShares')}: {totalShares}</p>
      )}
    </div>
  );
}
