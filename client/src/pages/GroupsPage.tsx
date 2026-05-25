import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGroups, useCreateGroup } from '../hooks/useGroups';
import { GroupCard } from '../components/GroupCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { CurrencySelect } from '../components/CurrencySelect';

export function GroupsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createGroup.mutateAsync({ name, description: description || undefined, defaultCurrency: currency });
      setOpen(false);
      setName('');
      setDescription('');
      setCurrency('USD');
    } catch {
      setError(t('groups.failed'));
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('groups.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/join')}>{t('groups.joinGroup')}</Button>
          <Button onClick={() => setOpen(true)}>{t('groups.newGroup')}</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">{t('groups.loading')}</div>
      ) : groups?.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="mb-4">{t('groups.noGroups')}</p>
          <Button onClick={() => setOpen(true)}>{t('groups.createFirst')}</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups?.map((group) => <GroupCard key={group.id} group={group} />)}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('groups.createGroup')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">{t('groups.name')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">{t('groups.description')}</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">{t('groups.defaultCurrency')}</Label>
              <CurrencySelect id="currency" value={currency} onChange={setCurrency} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('groups.cancel')}</Button>
              <Button type="submit" disabled={createGroup.isPending}>
                {createGroup.isPending ? t('groups.creating') : t('groups.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
