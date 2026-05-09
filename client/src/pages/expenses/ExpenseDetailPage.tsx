import { useParams, useNavigate, Link } from 'react-router-dom';
import { useExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { useAuthStore } from '../../stores/auth.store';
import { useGroup } from '../../hooks/useGroups';
import { Button } from '../../components/ui/button';

export function ExpenseDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expense, isLoading } = useExpense(id);
  const { data: group } = useGroup(expense?.groupId ?? '');
  const deleteExpense = useDeleteExpense();
  const currentUserId = useAuthStore((s) => s.user?.id);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!expense) return <div className="p-6 text-destructive">Expense not found.</div>;

  const isAdmin = group?.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';
  const canEdit = expense.paidById === currentUserId || isAdmin;

  async function handleDelete() {
    if (!confirm('Delete this expense?')) return;
    await deleteExpense.mutateAsync({ expenseId: expense!.id, groupId: expense!.groupId });
    navigate(`/groups/${expense!.groupId}`);
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{expense.description}</h1>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              to={`/expenses/${id}/edit`}
              className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Edit
            </Link>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteExpense.isPending}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border p-5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold">{expense.amount.toFixed(2)} {expense.currency}</span>
        </div>
        {expense.currency !== expense.baseCurrency && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base Amount</span>
            <span>{expense.amountBase.toFixed(2)} {expense.baseCurrency}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid by</span>
          <span>{expense.paidBy.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span>{expense.date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Split type</span>
          <span>{expense.splitType}</span>
        </div>
        {expense.category && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span>{expense.category.icon} {expense.category.name}</span>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-3">Splits</h2>
        <div className="space-y-2">
          {expense.splits.map((split) => (
            <div key={split.id} className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{split.user?.name ?? split.userId}</span>
                {split.isSettled && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Settled</span>
                )}
              </div>
              <span className="text-sm font-semibold">{split.amount.toFixed(2)} {expense.baseCurrency}</span>
            </div>
          ))}
        </div>
      </div>

      {expense.receiptUrl && (
        <div className="mt-6">
          <h2 className="font-semibold mb-3">Receipt</h2>
          <img src={expense.receiptUrl} alt="Receipt" className="rounded-lg border max-w-full" />
        </div>
      )}

      <div className="mt-6">
        <Link
          to={`/groups/${expense.groupId}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Group
        </Link>
      </div>
    </div>
  );
}
