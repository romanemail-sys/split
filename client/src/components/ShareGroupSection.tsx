import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResetInviteCode } from '../hooks/useGroups';

interface Props {
  groupId: string;
  inviteCode: string;
  isAdmin: boolean;
}

export function ShareGroupSection({ groupId, inviteCode, isAdmin }: Props) {
  const { t } = useTranslation();
  const resetCode = useResetInviteCode(groupId);
  const [copiedField, setCopiedField] = useState<'link' | 'code' | 'id' | null>(null);
  const [showQr, setShowQr] = useState(false);

  const baseUrl = `${window.location.origin}/#/join/`;
  const link = `${baseUrl}${inviteCode}`;

  function copy(text: string, field: 'link' | 'code' | 'id') {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  async function handleReset() {
    if (!confirm(t('share.confirmReset'))) return;
    await resetCode.mutateAsync();
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{t('share.title')}</h2>
        {isAdmin && (
          <button
            onClick={handleReset}
            disabled={resetCode.isPending}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            {t('share.resetCode')}
          </button>
        )}
      </div>

      {/* Invite link */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('share.inviteLink')}</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 truncate"
          />
          <button
            onClick={() => copy(link, 'link')}
            className="shrink-0 text-xs px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {copiedField === 'link' ? '✓' : t('share.copy')}
          </button>
        </div>
      </div>

      {/* Invite code */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('share.inviteCode')}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 truncate">
            {inviteCode}
          </code>
          <button
            onClick={() => copy(inviteCode, 'code')}
            className="shrink-0 text-xs px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            {copiedField === 'code' ? '✓' : t('share.copy')}
          </button>
        </div>
      </div>

      {/* Group ID */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('share.groupId')}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 truncate">
            {groupId}
          </code>
          <button
            onClick={() => copy(groupId, 'id')}
            className="shrink-0 text-xs px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            {copiedField === 'id' ? '✓' : t('share.copy')}
          </button>
        </div>
      </div>

      {/* QR code toggle */}
      <button
        onClick={() => setShowQr((v) => !v)}
        className="w-full text-sm text-blue-600 hover:text-blue-700 py-1 transition-colors"
      >
        {showQr ? t('share.hideQr') : t('share.showQr')}
      </button>

      {showQr && (
        <div className="flex justify-center pt-1">
          <div className="p-3 bg-white rounded-xl border border-slate-200 inline-block">
            <img src={qrUrl} alt="QR code" width={220} height={220} className="rounded" />
            <p className="text-center text-xs text-slate-400 mt-2">{t('share.qrHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
