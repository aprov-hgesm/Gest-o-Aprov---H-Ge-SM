'use client';

import { useState } from 'react';
import { Cloud, CloudOff, Download, RefreshCw } from 'lucide-react';
import type { Identified } from '@/lib/persistence/core';
import type { SyncController, SyncView } from '@/lib/persistence/controller';

export default function SyncStatus<T extends Identified>({
  title, state, controller, position = 'right'
}: {
  title: string;
  state: SyncView<T>;
  controller: SyncController<T>;
  position?: 'left' | 'right';
}) {
  const [expanded, setExpanded] = useState(false);
  const [exportError, setExportError] = useState('');
  const needsAttention = state.status === 'error' || state.status === 'conflict' ||
    !!state.storageWarning || !!exportError;
  const busy = state.status === 'loading' || state.status === 'saving';
  const download = () => {
    try {
      const blob = new Blob([controller.exportData()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'gestao-aprov-recuperacao-' + position + '-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportError('');
    } catch { setExportError('Não foi possível exportar a cópia. Tente novamente.'); }
  };
  return (
    <aside className={'no-print mx-3 my-2 shrink-0 rounded-xl border shadow-sm text-xs ' +
      (needsAttention ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-300 bg-white text-slate-800')}
      aria-label={'Sincronização: ' + title}>
      <button type="button" className="w-full flex items-center gap-2 p-3 text-left"
        onClick={() => setExpanded(!expanded)} aria-expanded={expanded || needsAttention}>
        {needsAttention ? <CloudOff size={17} aria-hidden="true" /> : <Cloud size={17} aria-hidden="true" />}
        <span className="min-w-0 flex-1">
          <strong className="block">{title}</strong>
          <span role="status" aria-live="polite">{state.message}</span>
        </span>
      </button>
      {(expanded || needsAttention) && (
        <div className="border-t border-current/10 px-3 pb-3 pt-2 space-y-2">
          {state.storageWarning && <p role="alert">{state.storageWarning}</p>}
          {exportError && <p role="alert">{exportError}</p>}
          {state.legacyCount > 0 && <p>{state.legacyCount} registro(s) do navegador aguardam migração ou comparação.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={controller.retry} disabled={busy}
              className="border rounded-md px-2 py-1.5 flex gap-1 items-center disabled:opacity-50">
              <RefreshCw size={13} /> Tentar conexão
            </button>
            <button type="button" onClick={download} className="border rounded-md px-2 py-1.5 flex gap-1 items-center">
              <Download size={13} /> Exportar recuperação
            </button>
            {state.legacyCount > 0 && !state.pending && (
              <button type="button" onClick={controller.importLegacy} disabled={busy}
                className="border rounded-md px-2 py-1.5 disabled:opacity-50">Enviar dados locais</button>
            )}
            {(state.pending || state.status === 'conflict') && (
              <button type="button" disabled={busy} className="border rounded-md px-2 py-1.5 disabled:opacity-50"
                onClick={() => {
                  if (window.confirm('Carregar os dados atuais do servidor? Uma cópia da versão local será preservada para recuperação.')) controller.useServer();
                }}>Usar versão do servidor</button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
