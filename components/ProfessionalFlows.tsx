'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeftRight,
  FileClock,
  History,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeeklyCardapioDoc, WorkflowStatus } from '@/components/CardapioSemanal';
import type { OperationalTab, ProfessionalSection } from '@/lib/domain/operational-navigation';
import {
  normalizeAdminSettings,
  resolveSwapOperationalStatus,
  splitLines,
  type AdminSettings,
  type AuditEvent,
  type AuditModule,
  type SwapRecord,
} from '@/lib/domain/professional-flows';

interface CardapioVersionSnapshot {
  id: string;
  version: number;
  createdAt: string;
  reason: string;
  workflowStatus: WorkflowStatus;
  snapshot: string;
}

type ProfessionalCardapio = WeeklyCardapioDoc & {
  version?: number;
  versions?: CardapioVersionSnapshot[];
  archivedAt?: string;
  archiveReason?: string;
  lastChangeReason?: string;
};

interface Props {
  auditTrail: AuditEvent[];
  swaps: SwapRecord[];
  settings: AdminSettings;
  cardapios: WeeklyCardapioDoc[];
  onCancelSwap: (id: string, note?: string) => void;
  onArchiveCardapio: (id: string, reason: string) => void;
  onRestoreCardapio: (id: string) => void;
  onRestoreVersion: (cardapioId: string, versionId: string, reason: string) => void;
  onSaveSettings: (settings: AdminSettings) => void;
  initialSection?: ProfessionalSection;
  onNavigate?: (tab: OperationalTab) => void;
}

const moduleOptions: Array<'Todos' | AuditModule> = [
  'Todos', 'Escalas', 'Efetivo', 'Afastamentos', 'Cardápio', 'Permutas', 'Configurações', 'Arquivamento', 'Sistema'
];

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function actionLabel(action: AuditEvent['action']) {
  return {
    CRIACAO: 'Criação', ALTERACAO: 'Alteração', EXCLUSAO: 'Exclusão', ARQUIVAMENTO: 'Arquivamento',
    RESTAURACAO: 'Restauração', FINALIZACAO: 'Finalização', REABERTURA: 'Reabertura',
    PERMUTA: 'Permuta', CANCELAMENTO: 'Cancelamento'
  }[action];
}

export default function ProfessionalFlows({
  auditTrail,
  swaps,
  settings,
  cardapios,
  onCancelSwap,
  onArchiveCardapio,
  onRestoreCardapio,
  onRestoreVersion,
  onSaveSettings,
  initialSection = 'historico',
  onNavigate,
}: Props) {
  const [section, setSection] = useState<ProfessionalSection>(initialSection);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'Todos' | AuditModule>('Todos');
  const [draft, setDraft] = useState(() => normalizeAdminSettings(settings));
  const [postsText, setPostsText] = useState(settings.rosterPosts.join('\n'));
  const [absenceText, setAbsenceText] = useState(settings.absenceTypes.join('\n'));
  const [specialtyText, setSpecialtyText] = useState(settings.specialties.join('\n'));
  const [rankText, setRankText] = useState(settings.ranks.join('\n'));

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    const normalized = normalizeAdminSettings(settings);
    setDraft(normalized);
    setPostsText(normalized.rosterPosts.join('\n'));
    setAbsenceText(normalized.absenceTypes.join('\n'));
    setSpecialtyText(normalized.specialties.join('\n'));
    setRankText(normalized.ranks.join('\n'));
  }, [settings]);

  const filteredAudit = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditTrail.filter(event => {
      if (moduleFilter !== 'Todos' && event.module !== moduleFilter) return false;
      if (!q) return true;
      return [event.summary, event.module, event.action, event.entityType, event.entityId, event.note, event.previousValue, event.newValue]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(q));
    });
  }, [auditTrail, moduleFilter, search]);

  const professionalCardapios = cardapios as ProfessionalCardapio[];
  const archivedCount = professionalCardapios.filter(item => !!item.archivedAt).length;
  const versionCount = professionalCardapios.reduce((sum, item) => sum + (item.versions?.length || 0), 0);
  const activeSwaps = swaps.filter(item => resolveSwapOperationalStatus(item) === 'ATIVA').length;

  const tabs: Array<{ id: ProfessionalSection; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'historico', label: 'Histórico e Auditoria', icon: History, badge: auditTrail.length },
    { id: 'permutas', label: 'Permutas', icon: ArrowLeftRight, badge: activeSwaps },
    { id: 'cardapios', label: 'Versões e Arquivo', icon: FileClock, badge: archivedCount + versionCount },
    { id: 'configuracoes', label: 'Configurações', icon: Settings2 },
  ];

  const saveSettings = () => {
    const candidate = normalizeAdminSettings({
      ...draft,
      rosterPosts: splitLines(postsText),
      absenceTypes: splitLines(absenceText),
      specialties: splitLines(specialtyText),
      ranks: splitLines(rankText),
    });
    onSaveSettings(candidate);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 mb-1">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">Bloco 3 · Fluxos Profissionais</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Rastreabilidade e governança operacional</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">Histórico estruturado, permutas rastreáveis, versionamento de cardápios, arquivamento/restauração e parâmetros administrativos.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onNavigate && (
            <button onClick={() => onNavigate('inicio')} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">Central Operacional</button>
          )}
          <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><div className="text-lg font-bold text-slate-900">{auditTrail.length}</div><div className="text-[10px] text-slate-500">eventos</div></div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><div className="text-lg font-bold text-slate-900">{activeSwaps}</div><div className="text-[10px] text-slate-500">permutas</div></div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><div className="text-lg font-bold text-slate-900">{archivedCount}</div><div className="text-[10px] text-slate-500">arquivados</div></div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setSection(tab.id)} className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors',
              section === tab.id ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            )}>
              <Icon className="w-4 h-4" />{tab.label}
              {typeof tab.badge === 'number' && tab.badge > 0 && <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-[9px]">{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {section === 'historico' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div><h4 className="font-bold text-slate-900">Histórico completo de operações</h4><p className="text-xs text-slate-500 mt-0.5">Eventos persistidos com data/hora, módulo, ação e contexto operacional.</p></div>
            <div className="flex gap-2">
              <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value as 'Todos' | AuditModule)} className="border border-slate-200 rounded-lg text-xs px-3 py-2 bg-white">
                {moduleOptions.map(item => <option key={item}>{item}</option>)}
              </select>
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar no histórico..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs w-56" /></div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {filteredAudit.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Nenhum evento corresponde aos filtros.</div> : filteredAudit.map(event => (
              <div key={event.id} className="p-4 flex gap-3">
                <div className="mt-0.5 w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><History className="w-4 h-4 text-slate-600" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">{event.module}</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{actionLabel(event.action)}</span><span className="text-[10px] text-slate-400">{formatDateTime(event.createdAt)}</span></div>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{event.summary}</p>
                  {(event.previousValue || event.newValue) && <div className="grid md:grid-cols-2 gap-2 mt-2 text-[11px]"><div className="rounded-lg bg-rose-50 border border-rose-100 p-2"><strong>Antes:</strong> {event.previousValue || '—'}</div><div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2"><strong>Depois:</strong> {event.newValue || '—'}</div></div>}
                  {event.note && <p className="text-[11px] text-slate-500 mt-1">Observação: {event.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {section === 'permutas' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100"><h4 className="font-bold text-slate-900">Registro estruturado de permutas</h4><p className="text-xs text-slate-500 mt-0.5">A permuta preserva militar original, substituto, data, posto, situação e histórico.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-left">Data / Posto</th><th className="p-3 text-left">Original</th><th className="p-3 text-left">Substituto</th><th className="p-3 text-left">Registro</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Ação</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{swaps.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">Nenhuma permuta estruturada registrada.</td></tr> : swaps.map(item => {
                const operationalStatus = resolveSwapOperationalStatus(item);
                return <tr key={item.id}><td className="p-3"><div className="font-bold text-slate-800">{item.day}</div><div className="text-slate-500">{item.post}</div></td><td className="p-3">{item.originalRank} {item.originalMilitaryName}</td><td className="p-3 font-semibold">{item.replacementRank} {item.replacementMilitaryName}</td><td className="p-3 text-slate-500">{formatDateTime(item.createdAt)}</td><td className="p-3"><span className={cn('px-2 py-1 rounded-full font-bold text-[10px]', operationalStatus === 'ATIVA' ? 'bg-emerald-100 text-emerald-800' : operationalStatus === 'CONCLUIDA' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600')}>{operationalStatus === 'ATIVA' ? 'ATIVA' : operationalStatus === 'CONCLUIDA' ? 'CONCLUÍDA' : 'CANCELADA'}</span>{item.note && <div className="text-[10px] text-slate-500 mt-1 max-w-56">{item.note}</div>}</td><td className="p-3 text-right">{operationalStatus === 'ATIVA' && <button onClick={() => { const note = window.prompt('Motivo/observação do cancelamento da permuta:') || ''; if (window.confirm('Cancelar esta permuta? O sistema tentará restaurar o militar original se o posto ainda estiver com o substituto.')) onCancelSwap(item.id, note); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50"><XCircle className="w-3.5 h-3.5" />Cancelar</button>}</td></tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      )}

      {section === 'cardapios' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900"><strong>Política de preservação:</strong> arquivar não exclui dados. Restaurar uma versão cria uma nova versão de trabalho e retorna o documento para elaboração, preservando o histórico anterior.</div>
          {professionalCardapios.length === 0 ? <div className="p-10 text-center text-slate-500 bg-white border rounded-2xl">Nenhum cardápio cadastrado.</div> : professionalCardapios.slice().sort((a,b) => b.dataInicio.localeCompare(a.dataInicio)).map(cardapio => (
            <section key={cardapio.id} className={cn('bg-white rounded-2xl border shadow-sm overflow-hidden', cardapio.archivedAt ? 'border-slate-300 opacity-80' : 'border-slate-200')}>
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
                <div><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-slate-900">{cardapio.dataInicio} a {cardapio.dataFim}</h4><span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">v{cardapio.version || 1}</span>{cardapio.archivedAt && <span className="text-[10px] px-2 py-1 rounded-full bg-slate-200 text-slate-700 font-bold">ARQUIVADO</span>}</div><p className="text-xs text-slate-500 mt-1">Status: {cardapio.workflow.status} · {cardapio.versions?.length || 0} versão(ões) preservada(s)</p>{cardapio.archiveReason && <p className="text-[11px] text-slate-500 mt-1">Motivo do arquivo: {cardapio.archiveReason}</p>}</div>
                <div>{cardapio.archivedAt ? <button onClick={() => onRestoreCardapio(cardapio.id)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-50"><RotateCcw className="w-4 h-4" />Restaurar do arquivo</button> : <button onClick={() => { const reason = window.prompt('Motivo do arquivamento:'); if (reason?.trim()) onArchiveCardapio(cardapio.id, reason.trim()); }} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"><Archive className="w-4 h-4" />Arquivar</button>}</div>
              </div>
              <div className="p-4">
                {!cardapio.versions?.length ? <p className="text-xs text-slate-500">Nenhuma versão finalizada preservada ainda. A primeira é criada automaticamente ao finalizar o cardápio.</p> : <div className="grid lg:grid-cols-2 gap-2">{cardapio.versions.slice().sort((a,b) => b.version-a.version).map(version => <div key={version.id} className="rounded-xl border border-slate-200 p-3 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="font-bold text-sm text-slate-900">Versão {version.version}</span><span className="text-[10px] text-slate-500">{version.workflowStatus}</span></div><p className="text-[11px] text-slate-500 mt-1">{formatDateTime(version.createdAt)} · {version.reason}</p></div><button onClick={() => { const reason = window.prompt(`Motivo para restaurar a versão ${version.version}:`); if (reason?.trim() && window.confirm(`Restaurar o conteúdo da versão ${version.version} como nova versão de trabalho?`)) onRestoreVersion(cardapio.id, version.id, reason.trim()); }} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-[10px] font-bold hover:bg-blue-50"><RotateCcw className="w-3.5 h-3.5" />Restaurar</button></div>)}</div>}
              </div>
            </section>
          ))}
        </div>
      )}

      {section === 'configuracoes' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100"><div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-emerald-700" /><h4 className="font-bold text-slate-900">Configurações administrativas</h4></div><p className="text-xs text-slate-500 mt-1">Parâmetros operacionais centralizados. Um item por linha. Registros históricos existentes nunca são apagados ao alterar listas.</p></div>
          <div className="p-5 grid lg:grid-cols-2 gap-5">
            <ConfigBox label="Funções / postos da escala" value={postsText} onChange={setPostsText} help="Usadas nas opções administrativas da escala. Postos históricos já cadastrados são preservados." />
            <ConfigBox label="Tipos de afastamento" value={absenceText} onChange={setAbsenceText} help="Opções exibidas no cadastro de afastamentos." />
            <ConfigBox label="Especialidades" value={specialtyText} onChange={setSpecialtyText} help="Opções utilizadas no cadastro do efetivo; não criam regra automática de seleção." />
            <ConfigBox label="Postos / graduações" value={rankText} onChange={setRankText} help="Lista administrativa usada no cadastro de militares." />
            <div className="lg:col-span-2 rounded-xl border border-slate-200 p-4"><label className="text-xs font-bold text-slate-700">Limite de eventos no histórico</label><div className="flex items-center gap-3 mt-2"><input type="number" min={100} max={5000} step={100} value={draft.historyRetentionLimit} onChange={e => setDraft(prev => ({...prev, historyRetentionLimit: Number(e.target.value)}))} className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm" /><span className="text-xs text-slate-500">Entre 100 e 5.000 eventos estruturados.</span></div></div>
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-end"><button onClick={saveSettings} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900"><Save className="w-4 h-4" />Salvar configurações</button></div>
        </section>
      )}
    </div>
  );
}

function ConfigBox({ label, value, onChange, help }: { label: string; value: string; onChange: (value: string) => void; help: string }) {
  return <div><label className="text-xs font-bold text-slate-700">{label}</label><textarea value={value} onChange={e => onChange(e.target.value)} rows={7} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-700" /><p className="text-[11px] text-slate-500 mt-1">{help}</p></div>;
}
