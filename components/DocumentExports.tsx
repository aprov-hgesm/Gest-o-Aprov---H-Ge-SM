'use client';

import { useState } from 'react';
import { FileDown, X } from 'lucide-react';
import jsPDF from 'jspdf';
import { normalizeMilitaryStatuses, resolveAbsenceStatus, rosterCompliance } from '@/lib/domain/roster-integrity';

type ScaleType = 'EP' | 'EV' | 'Ambas';

type RosterCell = {
  militaryId: string;
  militaryName: string;
  rank: string;
  type: 'EP' | 'EV' | 'PERM' | 'DISP';
};

type Military = {
  id: string;
  rank: string;
  name: string;
  fullName: string;
  matricula: string;
  specialty: string;
  specialtySecondary?: string;
  status: 'Ativo' | 'Afastado';
  type: ScaleType;
  dutyCount: number;
};

type Absence = {
  id: string;
  militaryId: string;
  militaryName: string;
  rank: string;
  type: string;
  startDate: string;
  endDate: string;
  indefinite: boolean;
  notes: string;
  autoUpdate: boolean;
  status: 'ATIVO' | 'AGENDADO' | 'ENCERRADO' | 'CANCELADO';
  actualEndDate?: string;
  closedAt?: string;
};

type HolidayDate = { id: string; date: string; name: string };
type WeekRoster = Record<string, Record<string, RosterCell | null>>;

type RosterDocument = {
  id: string;
  militaryList: Military[];
  absences: Absence[];
  roster: WeekRoster;
  changelogs: Array<{ time: string; text: string }>;
  customHolidays: HolidayDate[];
};

type TableColumn = { label: string; width: number };

const CACHE_KEY = 'gestao-aprov:firestore:v1:roster';
const MARGIN = 12;

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function readRosterDocument(): RosterDocument | null {
  const cache = safeJson<{ records?: RosterDocument[] }>(localStorage.getItem(CACHE_KEY));
  const cached = cache?.records?.find(record => record?.id === 'principal') ?? cache?.records?.[0];
  if (cached?.militaryList && cached?.absences && cached?.roster) return cached;

  const militaryList = safeJson<Military[]>(localStorage.getItem('dr_military'));
  const absences = safeJson<Absence[]>(localStorage.getItem('dr_absences'));
  const roster = safeJson<WeekRoster>(localStorage.getItem('dr_roster'));
  const changelogs = safeJson<Array<{ time: string; text: string }>>(localStorage.getItem('dr_logs'));
  const customHolidays = safeJson<HolidayDate[]>(localStorage.getItem('dr_holidays'));
  if (!militaryList && !absences && !roster) return null;
  return {
    id: 'principal',
    militaryList: militaryList ?? [],
    absences: absences ?? [],
    roster: roster ?? {},
    changelogs: changelogs ?? [],
    customHolidays: customHolidays ?? [],
  };
}

function isoFromDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function brDate(value: string): string {
  if (!value) return '—';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function todayStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function timestampPtBr() {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
}

function addHeader(pdf: jsPDF, title: string, subtitle?: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('HOSPITAL GERAL DE SANTA MARIA', MARGIN, 14);
  pdf.setFontSize(12);
  pdf.text(title, MARGIN, 21);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  if (subtitle) pdf.text(subtitle, MARGIN, 26);
  pdf.text(`Gerado em ${timestampPtBr()}`, pageWidth - MARGIN, 26, { align: 'right' });
  pdf.setDrawColor(148, 163, 184);
  pdf.line(MARGIN, 29, pageWidth - MARGIN, 29);
  return 35;
}

function continuationTop(pdf: jsPDF, title: string) {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`${title} — continuação`, MARGIN, 9);
  return 13;
}

function addPageIfNeeded(pdf: jsPDF, y: number, needed: number, title: string) {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (y + needed <= pageHeight - MARGIN) return y;
  pdf.addPage();
  return continuationTop(pdf, title);
}

function drawSectionTitle(pdf: jsPDF, y: number, text: string, title: string) {
  y = addPageIfNeeded(pdf, y, 10, title);
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(MARGIN, y, pdf.internal.pageSize.getWidth() - MARGIN * 2, 8, 1, 1, 'F');
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text(text, MARGIN + 3, y + 5.4);
  return y + 12;
}

function drawTable(pdf: jsPDF, y: number, title: string, columns: TableColumn[], rows: string[][]) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const usable = pageWidth - MARGIN * 2;
  const declared = columns.reduce((sum, column) => sum + column.width, 0);
  const scale = usable / declared;
  const widths = columns.map(column => column.width * scale);

  const drawHeader = (startY: number) => {
    pdf.setFillColor(30, 56, 43);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.4);
    let x = MARGIN;
    columns.forEach((column, index) => {
      pdf.rect(x, startY, widths[index], 8, 'F');
      pdf.text(column.label, x + 2, startY + 5.2, { maxWidth: widths[index] - 4 });
      x += widths[index];
    });
    return startY + 8;
  };

  y = addPageIfNeeded(pdf, y, 16, title);
  y = drawHeader(y);
  if (!rows.length) {
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(8);
    pdf.text('Nenhum registro disponível.', MARGIN + 2, y + 6);
    return y + 12;
  }

  rows.forEach((row, rowIndex) => {
    const wrapped = row.map((cell, index) => pdf.splitTextToSize(String(cell ?? '—'), Math.max(8, widths[index] - 4)) as string[]);
    const lineCount = Math.max(1, ...wrapped.map(lines => lines.length));
    const rowHeight = Math.max(7, lineCount * 3.6 + 3);
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (y + rowHeight > pageHeight - MARGIN) {
      pdf.addPage();
      y = continuationTop(pdf, title);
      y = drawHeader(y);
    }

    if (rowIndex % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(MARGIN, y, usable, rowHeight, 'F');
    }
    pdf.setDrawColor(203, 213, 225);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.2);
    let x = MARGIN;
    wrapped.forEach((lines, index) => {
      pdf.rect(x, y, widths[index], rowHeight);
      pdf.text(lines, x + 2, y + 4.2);
      x += widths[index];
    });
    y += rowHeight;
  });
  return y + 4;
}

function savePdf(pdf: jsPDF, prefix: string) {
  pdf.setProperties({
    title: prefix.replaceAll('-', ' '),
    subject: 'Gestão de Aprovisionamento - HGeSM',
    author: 'Hospital Geral de Santa Maria',
    creator: 'Gestão Aprov',
  });
  pdf.save(`${prefix}-${todayStamp()}.pdf`);
}

function scaleRows(data: RosterDocument) {
  const holidayMap = new Map(data.customHolidays.map(item => [item.date, item.name]));
  return Object.entries(data.roster)
    .sort(([a], [b]) => isoFromDate(a).localeCompare(isoFromDate(b)))
    .flatMap(([day, posts]) => Object.entries(posts).map(([post, cell]) => {
      const iso = isoFromDate(day);
      const holiday = holidayMap.get(iso);
      const dateLabel = holiday ? `${brDate(iso)} — ${holiday}` : brDate(iso);
      const military = cell ? `${cell.rank}. ${cell.militaryName}` : 'VAGO';
      const type = cell?.type === 'PERM' ? 'Permuta' : cell?.type === 'DISP' ? 'Dispensa' : cell?.type ?? '—';
      return [dateLabel, post, military, type];
    }));
}

function exportScale(data: RosterDocument) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  let y = addHeader(pdf, 'ESCALA DE SERVIÇO', 'Finais de semana, feriados e datas especiais');
  y = drawTable(pdf, y, 'Escala de Serviço', [
    { label: 'Data', width: 52 }, { label: 'Função', width: 78 }, { label: 'Militar', width: 105 }, { label: 'Tipo', width: 35 },
  ], scaleRows(data));
  void y;
  savePdf(pdf, 'Escala-de-Servico-HGeSM');
}

function exportPersonnel(data: RosterDocument) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  let y = addHeader(pdf, 'EFETIVO MILITAR', `${data.militaryList.length} militar(es) cadastrado(s)`);
  const rows = [...data.militaryList]
    .sort((a, b) => Number(a.matricula) - Number(b.matricula))
    .map(military => [
      military.rank,
      military.name,
      military.fullName,
      military.matricula,
      [military.specialty, military.specialtySecondary].filter(Boolean).join(' / '),
      military.status,
      military.type,
      String(military.dutyCount ?? 0),
    ]);
  y = drawTable(pdf, y, 'Efetivo Militar', [
    { label: 'Grad.', width: 20 }, { label: 'Nome', width: 38 }, { label: 'Nome completo', width: 78 },
    { label: 'Antig.', width: 24 }, { label: 'Especialidade', width: 70 }, { label: 'Status', width: 30 },
    { label: 'Escala', width: 25 }, { label: 'Svç.', width: 18 },
  ], rows);
  void y;
  savePdf(pdf, 'Efetivo-Militar-HGeSM');
}

function exportAbsences(data: RosterDocument) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const active = data.absences.filter(item => resolveAbsenceStatus(item) === 'ATIVO').length;
  let y = addHeader(pdf, 'RELATÓRIO DE AFASTAMENTOS', `${active} ativo(s) de ${data.absences.length} registro(s)`);
  const rows = [...data.absences]
    .sort((a, b) => {
      const statusA = resolveAbsenceStatus(a);
      const statusB = resolveAbsenceStatus(b);
      if (statusA === statusB) return isoFromDate(a.startDate).localeCompare(isoFromDate(b.startDate));
      const order = { ATIVO: 0, AGENDADO: 1, ENCERRADO: 2, CANCELADO: 3 } as const;
      return order[statusA] - order[statusB];
    })
    .map(item => [
      `${item.rank}. ${item.militaryName}`,
      item.type,
      brDate(item.startDate),
      item.indefinite ? 'Indeterminado' : brDate(item.endDate),
      resolveAbsenceStatus(item),
      item.autoUpdate ? 'Sim' : 'Não',
      item.notes || '—',
    ]);
  y = drawTable(pdf, y, 'Relatório de Afastamentos', [
    { label: 'Militar', width: 55 }, { label: 'Tipo', width: 48 }, { label: 'Início', width: 28 },
    { label: 'Término', width: 34 }, { label: 'Status', width: 28 }, { label: 'Auto', width: 20 }, { label: 'Observações', width: 80 },
  ], rows);
  void y;
  savePdf(pdf, 'Afastamentos-HGeSM');
}

function exportGeneralReport(data: RosterDocument) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const normalizedMilitary = normalizeMilitaryStatuses(data.militaryList, data.absences);
  const activeMilitary = normalizedMilitary.filter(item => item.status === 'Ativo').length;
  const awayMilitary = normalizedMilitary.filter(item => item.status === 'Afastado').length;
  const activeAbsences = data.absences.filter(item => resolveAbsenceStatus(item) === 'ATIVO').length;
  const { rate: occupation } = rosterCompliance(data.roster);

  let y = addHeader(pdf, 'RELATÓRIO GERAL DE APROVISIONAMENTO', 'Efetivo, afastamentos, escala e histórico operacional');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 41, 59);
  pdf.text(`Efetivo: ${data.militaryList.length} | Ativos: ${activeMilitary} | Afastados: ${awayMilitary} | Afastamentos ativos: ${activeAbsences} | Ocupação da escala: ${occupation}%`, MARGIN, y);
  y += 8;

  y = drawSectionTitle(pdf, y, 'Escala de serviço', 'Relatório Geral');
  y = drawTable(pdf, y, 'Relatório Geral', [
    { label: 'Data', width: 52 }, { label: 'Função', width: 78 }, { label: 'Militar', width: 105 }, { label: 'Tipo', width: 35 },
  ], scaleRows(data));

  y = drawSectionTitle(pdf, y, 'Afastamentos ativos e agendados', 'Relatório Geral');
  const absenceRows = data.absences.map(item => [
    `${item.rank}. ${item.militaryName}`,
    item.type,
    brDate(item.startDate),
    item.indefinite ? 'Indeterminado' : brDate(item.endDate),
    item.status,
    item.notes || '—',
  ]);
  y = drawTable(pdf, y, 'Relatório Geral', [
    { label: 'Militar', width: 58 }, { label: 'Tipo', width: 50 }, { label: 'Início', width: 30 },
    { label: 'Término', width: 35 }, { label: 'Status', width: 30 }, { label: 'Observações', width: 85 },
  ], absenceRows);

  y = drawSectionTitle(pdf, y, 'Feriados e datas especiais', 'Relatório Geral');
  y = drawTable(pdf, y, 'Relatório Geral', [
    { label: 'Data', width: 50 }, { label: 'Descrição', width: 210 },
  ], [...data.customHolidays].sort((a, b) => a.date.localeCompare(b.date)).map(item => [brDate(item.date), item.name]));

  y = drawSectionTitle(pdf, y, 'Histórico operacional recente', 'Relatório Geral');
  drawTable(pdf, y, 'Relatório Geral', [
    { label: 'Hora', width: 28 }, { label: 'Registro', width: 232 },
  ], data.changelogs.slice(-60).reverse().map(item => [item.time, item.text]));

  savePdf(pdf, 'Relatorio-Geral-HGeSM');
}

export default function DocumentExports() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (kind: 'scale' | 'personnel' | 'absences' | 'general') => {
    setBusy(true);
    try {
      const data = readRosterDocument();
      if (!data) {
        setMessage('Os dados ainda não foram carregados neste navegador.');
        return;
      }
      if (kind === 'scale') exportScale(data);
      if (kind === 'personnel') exportPersonnel(data);
      if (kind === 'absences') exportAbsences(data);
      if (kind === 'general') exportGeneralReport(data);
      setMessage('PDF gerado com sucesso.');
    } catch (error) {
      console.error('Erro ao gerar documento PDF:', error);
      setMessage('Não foi possível gerar o PDF.');
    } finally {
      setBusy(false);
      window.setTimeout(() => setMessage(''), 3500);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] no-print">
      {open && (
        <div className="mb-2 w-[290px] rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl" role="dialog" aria-label="Exportações PDF">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Documentos PDF</p>
              <p className="text-[11px] text-slate-500">Relatórios vetoriais com paginação automática</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Fechar exportações">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2">
            <button data-pdf-export="scale" disabled={busy} onClick={() => void run('scale')} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Baixar Escala de Serviço</button>
            <button data-pdf-export="personnel" disabled={busy} onClick={() => void run('personnel')} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Baixar Efetivo Militar</button>
            <button data-pdf-export="absences" disabled={busy} onClick={() => void run('absences')} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Baixar Afastamentos</button>
            <button data-pdf-export="general" disabled={busy} onClick={() => void run('general')} className="rounded-lg bg-[#1e382b] px-3 py-2 text-left text-xs font-semibold text-white hover:bg-[#284b3a] disabled:opacity-50">Baixar Relatório Geral</button>
          </div>
          {message && <p role="status" className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">{message}</p>}
        </div>
      )}
      <button type="button" onClick={() => setOpen(value => !value)} className="flex items-center gap-2 rounded-full bg-[#1e382b] px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-[#284b3a]" aria-label="Abrir exportações PDF" aria-expanded={open}>
        <FileDown className="h-4 w-4" />
        PDFs
      </button>
    </div>
  );
}
