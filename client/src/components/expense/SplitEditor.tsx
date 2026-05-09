import type { SplitType, SplitInput, GroupMember } from '@split/shared';
import { Input } from '../ui/input';

interface Props {
  splitType: SplitType;
  members: GroupMember[];
  splits: SplitInput[];
  onChange: (splits: SplitInput[]) => void;
}

export function SplitEditor({ splitType, members, splits, onChange }: Props) {
  function updateSplit(userId: string, patch: Partial<SplitInput>) {
    onChange(splits.map((s) => (s.userId === userId ? { ...s, ...patch } : s)));
  }

  if (splitType === 'EQUAL') {
    return (
      <p className="text-sm text-muted-foreground">Split equally among {members.length} members.</p>
    );
  }

  return (
    <div className="space-y-2">
      {splits.map((split) => {
        const member = members.find((m) => m.userId === split.userId);
        return (
          <div key={split.userId} className="flex items-center gap-3">
            <span className="w-28 text-sm truncate">{member?.user.name ?? split.userId}</span>
            {splitType === 'EXACT' && (
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={split.amount ?? ''}
                onChange={(e) => updateSplit(split.userId, { amount: parseFloat(e.target.value) || 0 })}
                className="w-28"
              />
            )}
            {splitType === 'PERCENTAGE' && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="%"
                  value={split.percentage ?? ''}
                  onChange={(e) => updateSplit(split.userId, { percentage: parseFloat(e.target.value) || 0 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
            {splitType === 'SHARES' && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Shares"
                  value={split.shares ?? ''}
                  onChange={(e) => updateSplit(split.userId, { shares: parseInt(e.target.value) || 1 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">shares</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
