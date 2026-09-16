'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Beef,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  Filter,
  PackageCheck,
  Search,
  Snowflake,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';
import {
  createOrTransitionSaqueRecord,
  decorateSaqueItem,
  filterSaqueItems,
  groupSaqueItems,
  summarizeSaque,
  type SaqueOperationalItem,
  type SaqueOperationalRecord,
  type SaqueOperationalStatus,
  type SaqueViewMode,
} from '@/lib/domain/saque-operacional';
import { gerarListaSaqueCarnes, type WeeklyCardapioDoc } from '@/components/CardapioSemanal';

interface HolidayLike { date: string; name: string; }

interface Props {
  cardapios: WeeklyCardapioDoc[];
  records: SaqueOperationalRecord[];
  holidays?: HolidayLike[];
  onUpdateRecords: (records: SaqueOperationalRecord[]) => boolean;
  onOpenCardapioDay: (dateIso: string) => void;
  onNotify?: (message: string, type?: 'success' | 'info') => void;
}

const statusStyles: Record<SaqueOperationalStatus, string> = {
  PENDENTE: 'bg-slate-100 text-slate-700 border-slate-200',
  SEPARADO: 'bg-amber-50 text-amber-800 border-amber-200',
  RETIRADO: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const urgencyStyles: Record<SaqueOperationalItem['urgency'], string> = {
  ATRASADO: 'bg-rose-50 text-rose-700 border-rose-200',
  HOJE: 'bg-amber-50 text-amber-800 border-amber-200',
  PROXIMO: 'bg-blue-50 text-blue-700 border-blue-200',
  FUTURO: 'bg-slate-50 text-slate-600 border-slate-200',
  CONCLUIDO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function isoToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function plusDays(iso: string, amount: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatKg(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function SaqueCarnesOperacional({
  cardapios,
  records,
  holidays = [],
  onUpdateRecords,
  onOpenCardapioDay,
  onNotify,
}: Props) {
  const today = isoToday();
  const [viewMode, setViewMode] = useState<SaqueViewMode>('RETIRADA');
  const [startDate, setStartDate] = useState(() => plusDays(today, -7));
  const [endDate, setEndDate] = useState(() => plusDays(today, 21));
  const [cutFilter, setCutFilter] = useState('TODOS');
  const [originFilter, setOriginFilter] = useState('TODAS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [query, setQuery] = useState('');
  const [historyItem, setHistoryItem] = useState<SaqueOperationalItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const activeCardapios = useMemo(() => cardapios.filter(item => !item.archivedAt), [cardapios]);
  const recordMap = useMemo(() => new Map(records.map(record => [record.id, record])), [records]);
  const holidayDates = useMemo(() => new Set(holidays.map(item => item.date)), [holidays]);

  const items = useMemo(() => {
    const result: SaqueOperationalItem[] = [];
    for (const cardapio of activeCardapios) {
      for (const item of gerarListaSaqueCarnes(cardapio.dias)) {
        const recordId = `${cardapio.id}__${item.id}`.replace(/[^a-zA-Z0-9_-]/g, '-');
        result.push(decorateSaqueItem(cardapio, item, recordMap.get(recordId), holidayDates, today));
      }
    }
    return result.sort((a, b) => a.dataSaqueIso.localeCompare(b.dataSaqueIso) || a.diaCardapioIso.localeCompare(b.diaCardapioIso));
  }, [activeCardapios, holidayDates, recordMap, today]);

  const cuts = useMemo(() => [...new Set(items.map(item => item.tipoCarne).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [items]);
  const filtered = useMemo(() => filterSaqueItems(items, {
    startDate, endDate, cut: cutFilter, origin: originFilter, status: statusFilter, query,
  }), [items, startDate, endDate, cutFilter, originFilter, statusFilter, query]);
  const groups = useMemo(() => groupSaqueItems(filtered, viewMode), [filtered, viewMode]);
  const summary = useMemo(() => summarizeSaque(filtered), [filtered]);

  const notify = (message: string, type: 'success' | 'info' = 'success') => onNotify?.(message, type);

  const updateStatus = (item: SaqueOperationalItem, status: SaqueOperationalStatus) => {
    const existing = recordMap.get(item.recordId);
    let note = existing?.note || '';
    if (status === 'RETIRADO') {
      const prompted = window.prompt('Observação da retirada (opcional):', note);
      if (prompted === null) return;
      note = prompted;
    }
    const nextRecord = createOrTransitionSaqueRecord(existing, {
      cardapioId: item.cardapioId,
      saqueItemId: item.id,
      status,
      note,
    });
    const nextRecords = existing
      ? records.map(record => record.id === existing.id ? nextRecord : record)
      : [...records, nextRecord];
    if (!onUpdateRecords(nextRecords)) {
      notify('Não foi possível registrar a situação operacional do saque.', 'info');
      return;
    }
    notify(status === 'RETIRADO' ? 'Retirada registrada com histórico.' : status === 'SEPARADO' ? 'Item marcado como separado.' : 'Item devolvido para pendente.');
  };

  const generatePdf = () => {
    if (!filtered.length) {
      notify('Não há itens no período/filtros atuais para gerar o PDF.', 'info');
      return;
    }
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const margin = 10;
    const usable = pageWidth - margin * 2;
    let y = 14;

    const newPageIfNeeded = (height = 8) => {
      if (y + height <= 198) return;
      pdf.addPage('a4', 'landscape');
      y = 14;
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('HOSPITAL GERAL DE SANTA MARIA - SAQUE DE CARNES', margin, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Período de retirada: ${formatDate(startDate)} a ${formatDate(endDate)} | Itens: ${filtered.length} | Total: ${formatKg(summary.totalKg)} kg`, margin, y);
    y += 7;

    for (const group of groups) {
      newPageIfNeeded(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      const groupLabel = viewMode === 'CORTE' ? group.key : formatDate(group.key);
      pdf.text(`${viewMode === 'RETIRADA' ? 'Retirada' : viewMode === 'CONSUMO' ? 'Consumo' : 'Corte'}: ${groupLabel} - ${formatKg(group.totalKg)} kg`, margin, y);
      y += 5;
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      for (const item of group.items) {
        newPageIfNeeded(7);
        const left = `${formatDate(item.dataSaqueIso)} | ${item.tipoCarne} | ${formatKg(item.quantidadeKg)} kg | ${item.origem}`;
        const right = `Consumo ${formatDate(item.diaCardapioIso)} | ${item.diasAntecedencia}d | ${item.status}`;
        pdf.text(left.slice(0, 105), margin, y);
        pdf.text(right.slice(0, 85), margin + usable * 0.58, y);
        y += 3.8;
        pdf.setTextColor(90);
        pdf.text(item.preparacao.slice(0, 150), margin + 3, y);
        pdf.setTextColor(0);
        y += 5;
      }
      y += 2;
    }

    pdf.save(`Saque-de-Carnes-HGeSM-${startDate}-a-${endDate}.pdf`);
    notify('PDF operacional do Saque de Carnes gerado.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 mb-1">
            <Beef className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">Bloco 5 · Operação do Saque</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Saque de Carnes</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">Acompanhe retirada, descongelamento e consumo sem alterar o conteúdo original do Cardápio Semanal.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreviewOpen(true)} className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Eye className="w-4 h-4" /> Conferir documento</button>
          <button onClick={generatePdf} className="px-3.5 py-2 rounded-lg bg-[#1e382b] text-white text-xs font-bold hover:bg-[#162b21] flex items-center gap-2"><Download className="w-4 h-4" /> Baixar PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric label="Itens no período" value={summary.totalItems} icon={Beef} />
        <Metric label="Total programado" value={`${formatKg(summary.totalKg)} kg`} icon={PackageCheck} />
        <Metric label="Atrasados" value={summary.overdue} icon={AlertTriangle} attention={summary.overdue > 0} />
        <Metric label="Retirada hoje" value={summary.today} icon={Clock3} attention={summary.today > 0} />
        <Metric label="Retirados" value={summary.withdrawn} icon={CheckCircle2} />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {([
              ['RETIRADA', 'Por retirada'],
              ['CONSUMO', 'Por consumo'],
              ['CORTE', 'Por corte'],
            ] as Array<[SaqueViewMode, string]>).map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={cn('px-3 py-2 rounded-lg text-xs font-bold transition-colors', viewMode === mode ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>{label}</button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400">{filtered.length} de {items.length} item(ns) exibidos</span>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar corte, preparo, origem..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-800" />
          </div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs" title="Início do período de retirada" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs" title="Fim do período de retirada" />
          <select value={cutFilter} onChange={e => setCutFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs"><option value="TODOS">Todos os cortes</option>{cuts.map(cut => <option key={cut} value={cut}>{cut}</option>)}</select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs"><option value="TODOS">Todos os status</option><option value="PENDENTE">Pendentes</option><option value="SEPARADO">Separados</option><option value="RETIRADO">Retirados</option></select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {['TODAS', 'ALMOÇO GERAL', 'ALMOÇO PACIENTE', 'JANTAR PACIENTE'].map(origin => <button key={origin} onClick={() => setOriginFilter(origin)} className={cn('px-2.5 py-1 rounded-full border text-[10px] font-bold', originFilter === origin ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-500 border-slate-200')}>{origin === 'TODAS' ? 'Todas as origens' : origin}</button>)}
        </div>
      </section>

      <div className="space-y-4">
        {groups.map(group => (
          <section key={group.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{viewMode === 'CORTE' ? group.key : formatDate(group.key)}</h4>
                <p className="text-[11px] text-slate-500">{group.items.length} item(ns) · {formatKg(group.totalKg)} kg</p>
              </div>
              {viewMode !== 'CORTE' && <CalendarDays className="w-4 h-4 text-slate-400" />}
            </div>
            <div className="divide-y divide-slate-100">
              {group.items.map(item => (
                <div key={`${item.cardapioId}-${item.id}`} className="p-4 grid xl:grid-cols-[1.15fr_1fr_0.75fr_auto] gap-4 items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className={cn('px-2 py-0.5 rounded-full border text-[9px] font-bold', urgencyStyles[item.urgency])}>{item.urgency}</span>
                      <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-[9px] font-bold">{item.origem}</span>
                      {(item.ehFimDeSemana || item.isHoliday) && <span className="px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[9px] font-bold">{item.isHoliday ? 'FERIADO' : 'FIM DE SEMANA'}</span>}
                    </div>
                    <p className="font-bold text-slate-900 text-sm truncate">{item.tipoCarne} · {formatKg(item.quantidadeKg)} kg</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.preparacao}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">Retirada</span><span className="font-semibold text-slate-700">{formatDate(item.dataSaqueIso)}</span><span className="block text-[10px] text-slate-400">{item.diaSemanaSaque}</span></div>
                    <div><span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">Consumo</span><span className="font-semibold text-slate-700">{formatDate(item.diaCardapioIso)}</span><span className="block text-[10px] text-slate-400">{item.diasAntecedencia} dia(s) antes</span></div>
                  </div>
                  <div>
                    <span className={cn('inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold', statusStyles[item.status])}>{item.status}</span>
                    {item.statusUpdatedAt && <p className="text-[9px] text-slate-400 mt-1">Atualizado {new Date(item.statusUpdatedAt).toLocaleString('pt-BR')}</p>}
                    {item.statusNote && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{item.statusNote}</p>}
                  </div>
                  <div className="flex flex-wrap xl:justify-end gap-1.5">
                    {item.status !== 'PENDENTE' && <button onClick={() => updateStatus(item, 'PENDENTE')} className="px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50">Pendente</button>}
                    {item.status !== 'SEPARADO' && <button onClick={() => updateStatus(item, 'SEPARADO')} className="px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-[10px] font-bold text-amber-800 hover:bg-amber-100">Separado</button>}
                    {item.status !== 'RETIRADO' && <button onClick={() => updateStatus(item, 'RETIRADO')} className="px-2 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100">Retirado</button>}
                    <button onClick={() => setHistoryItem(item)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50">Histórico</button>
                    <button onClick={() => onOpenCardapioDay(item.diaCardapioIso)} className="px-2 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-[10px] font-bold text-blue-700 hover:bg-blue-100 flex items-center gap-1">Cardápio <ChevronRight className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        {!groups.length && <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500"><Beef className="w-8 h-8 mx-auto mb-3 text-slate-300" /><p className="font-semibold">Nenhum item encontrado para os filtros atuais.</p></div>}
      </div>

      {historyItem && (
        <div className="fixed inset-0 bg-slate-950/45 z-50 flex items-center justify-center p-4" onClick={() => setHistoryItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between"><div><h4 className="font-bold text-slate-900">Histórico operacional</h4><p className="text-xs text-slate-500">{historyItem.tipoCarne} · {formatDate(historyItem.dataSaqueIso)}</p></div><button onClick={() => setHistoryItem(null)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button></div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {(recordMap.get(historyItem.recordId)?.history || []).slice().reverse().map((entry, index) => <div key={`${entry.at}-${index}`} className="flex gap-3"><span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" /><div><p className="text-xs font-bold text-slate-800">{entry.status}</p><p className="text-[10px] text-slate-400">{new Date(entry.at).toLocaleString('pt-BR')}</p>{entry.note && <p className="text-xs text-slate-600 mt-1">{entry.note}</p>}</div></div>)}
              {!recordMap.get(historyItem.recordId)?.history?.length && <p className="text-sm text-slate-500">Nenhuma movimentação registrada. O item permanece pendente por padrão.</p>}
            </div>
          </div>
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 bg-slate-950/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[88vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between"><div><h4 className="font-bold text-slate-900">Conferência antes do PDF</h4><p className="text-xs text-slate-500">Exatamente os {filtered.length} item(ns) filtrados · {formatKg(summary.totalKg)} kg</p></div><div className="flex gap-2"><button onClick={generatePdf} className="px-3 py-2 rounded-lg bg-[#1e382b] text-white text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4" />Gerar PDF</button><button onClick={() => setPreviewOpen(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button></div></div>
            <div className="p-5 overflow-y-auto space-y-3">
              {groups.map(group => <div key={group.key} className="border border-slate-200 rounded-xl overflow-hidden"><div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-800">{viewMode === 'CORTE' ? group.key : formatDate(group.key)} · {formatKg(group.totalKg)} kg</div>{group.items.map(item => <div key={`${item.cardapioId}-${item.id}`} className="px-4 py-2.5 border-t border-slate-100 grid grid-cols-[1fr_auto] gap-3 text-xs"><div><strong>{item.tipoCarne}</strong> · {item.preparacao}<div className="text-[10px] text-slate-400 mt-0.5">Retirada {formatDate(item.dataSaqueIso)} · Consumo {formatDate(item.diaCardapioIso)} · {item.origem}</div></div><div className="font-bold text-slate-800">{formatKg(item.quantidadeKg)} kg</div></div>)}</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon, attention = false }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; attention?: boolean }) {
  return <div className={cn('rounded-2xl border bg-white p-4 shadow-sm', attention ? 'border-amber-200' : 'border-slate-200')}><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span><Icon className={cn('w-4 h-4', attention ? 'text-amber-600' : 'text-emerald-700')} /></div><div className="text-2xl font-bold text-slate-900 mt-2">{value}</div></div>;
}
