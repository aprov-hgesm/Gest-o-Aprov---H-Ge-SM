'use client';

import React from 'react';
import {
  AlertTriangle,
  Beef,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCardapioReadiness } from '@/lib/domain/cardapio-readiness';
import { localIsoDate, resolveAbsenceStatus, type AbsenceStatus } from '@/lib/domain/roster-integrity';
import { gerarListaSaqueCarnes, type WeeklyCardapioDoc } from '@/components/CardapioSemanal';
import OperationalCalendar from '@/components/OperationalCalendar';
import type { OperationalCalendarDay } from '@/lib/domain/operational-calendar';
import type { OperationalTab } from '@/lib/domain/operational-navigation';
export type { OperationalTab } from '@/lib/domain/operational-navigation';

export interface OperationalMilitary {
  id: string;
  rank: string;
  name: string;
  status: 'Ativo' | 'Afastado';
  dutyCount: number;
}

export interface OperationalAbsence {
  id: string;
  militaryId: string;
  militaryName: string;
  rank: string;
  type: string;
  startDate: string;
  endDate: string;
  indefinite: boolean;
  status: AbsenceStatus;
  actualEndDate?: string;
}

export interface OperationalRosterCell {
  militaryId: string;
  militaryName: string;
  rank: string;
  type: 'EP' | 'EV' | 'PERM' | 'DISP';
}

export type OperationalRoster = Record<string, Record<string, OperationalRosterCell | null>>;

export interface OperationalAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  module: 'Escalas' | 'Afastamentos' | 'Cardápio' | 'Saque' | 'Sincronização';
  actionTab?: OperationalTab;
}

export interface OperationalSnapshot {
  today: string;
  availableMilitary: number;
  absentMilitary: number;
  vacantPostsNext7: number;
  servicesToday: Array<{ post: string; military: string; rank: string }>;
  meatKgToday: number;
  meatItemsToday: number;
  cardapio?: WeeklyCardapioDoc;
  cardapioIsUpcoming: boolean;
  cardapioReadiness: number | null;
  alerts: OperationalAlert[];
}

function isoFromRosterKey(value: string) {
  const parts = value.split('/');
  if (parts.length !== 3) return value;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function addDays(iso: string, amount: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + amount);
  return localIsoDate(date);
}

function formatDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(y, (m || 1) - 1, d || 1));
}

function formatLongDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }).format(new Date(y, (m || 1) - 1, d || 1));
}

function pickOperationalCardapio(cardapios: WeeklyCardapioDoc[], today: string) {
  const sorted = cardapios.filter(item => !item.archivedAt).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  const active = sorted.find(item => item.dataInicio <= today && item.dataFim >= today);
  if (active) return { cardapio: active, upcoming: false };
  const next = sorted.find(item => item.dataInicio > today);
  if (next) return { cardapio: next, upcoming: true };
  return { cardapio: undefined, upcoming: false };
}

export function buildOperationalSnapshot(params: {
  militaryList: OperationalMilitary[];
  absences: OperationalAbsence[];
  roster: OperationalRoster;
  cardapios: WeeklyCardapioDoc[];
  rosterPending?: boolean;
  cardapioPending?: boolean;
  today?: string;
}): OperationalSnapshot {
  const today = params.today || localIsoDate();
  const limit = addDays(today, 6);
  const alerts: OperationalAlert[] = [];

  const absentMilitary = params.militaryList.filter(item => item.status === 'Afastado').length;
  const availableMilitary = Math.max(0, params.militaryList.length - absentMilitary);

  const rosterDaysNext7 = Object.entries(params.roster)
    .map(([key, posts]) => ({ key, iso: isoFromRosterKey(key), posts }))
    .filter(item => item.iso >= today && item.iso <= limit)
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const vacanciesByDay = rosterDaysNext7.map(item => ({
    ...item,
    vacancies: Object.entries(item.posts).filter(([, cell]) => !cell || cell.type === 'DISP')
  })).filter(item => item.vacancies.length > 0);
  const vacantPostsNext7 = vacanciesByDay.reduce((sum, item) => sum + item.vacancies.length, 0);

  const todayRoster = rosterDaysNext7.find(item => item.iso === today);
  const servicesToday = todayRoster
    ? Object.entries(todayRoster.posts)
      .filter(([, cell]) => cell && cell.type !== 'DISP')
      .map(([post, cell]) => ({ post, military: cell!.militaryName, rank: cell!.rank }))
    : [];

  if (vacanciesByDay.length) {
    const first = vacanciesByDay[0];
    alerts.push({
      id: 'vacancies-next-7',
      severity: first.iso === today ? 'critical' : 'warning',
      title: `${vacantPostsNext7} posto(s) vago(s) nos próximos 7 dias`,
      detail: `Primeira ocorrência em ${formatDate(first.iso)}: ${first.vacancies.map(([post]) => post).join(', ')}.`,
      module: 'Escalas',
      actionTab: 'dashboard'
    });
  }

  const effectiveAbsences = params.absences.map(item => ({ ...item, effectiveStatus: resolveAbsenceStatus(item, today) }));
  const tomorrow = addDays(today, 1);
  effectiveAbsences.filter(item => item.effectiveStatus !== 'CANCELADO' && item.startDate === tomorrow).forEach(item => {
    alerts.push({
      id: `absence-start-${item.id}`,
      severity: 'info',
      title: `${item.rank} ${item.militaryName} inicia afastamento amanhã`,
      detail: `${item.type} a partir de ${formatDate(item.startDate)}.`,
      module: 'Afastamentos',
      actionTab: 'afastamentos'
    });
  });

  const returnLimit = addDays(today, 2);
  effectiveAbsences.filter(item =>
    item.effectiveStatus === 'ATIVO' && !item.indefinite && item.endDate >= today && item.endDate <= returnLimit
  ).forEach(item => {
    alerts.push({
      id: `absence-end-${item.id}`,
      severity: 'info',
      title: `Retorno previsto de ${item.rank} ${item.militaryName}`,
      detail: `${item.type} termina em ${formatDate(item.endDate)}.`,
      module: 'Afastamentos',
      actionTab: 'afastamentos'
    });
  });

  const selected = pickOperationalCardapio(params.cardapios, today);
  const cardapio = selected.cardapio;
  const readiness = cardapio ? getCardapioReadiness(cardapio) : null;
  const meatItems = params.cardapios.flatMap(item => gerarListaSaqueCarnes(item.dias));
  const meatToday = meatItems.filter(item => item.dataSaqueIso === today && item.quantidadeKg > 0);
  const meatKgToday = meatToday.reduce((sum, item) => sum + item.quantidadeKg, 0);
  const meatHorizon = addDays(today, 13);
  const zeroQuantityItems = meatItems.filter(item => item.tipoCarne && item.quantidadeKg <= 0 && item.diaCardapioIso >= today && item.diaCardapioIso <= meatHorizon);

  if (!cardapio) {
    alerts.push({
      id: 'no-cardapio',
      severity: 'warning',
      title: 'Nenhum cardápio semanal disponível',
      detail: 'Crie uma semana para habilitar o acompanhamento do cardápio e do saque de carnes.',
      module: 'Cardápio',
      actionTab: 'cardapio'
    });
  } else {
    if (readiness && !readiness.ok) {
      alerts.push({
        id: `cardapio-readiness-${cardapio.id}`,
        severity: 'warning',
        title: `Cardápio com ${readiness.percent}% de prontidão`,
        detail: `${readiness.missing.length} pendência(s) antes da finalização da semana ${formatDate(cardapio.dataInicio)} a ${formatDate(cardapio.dataFim)}.`,
        module: 'Cardápio',
        actionTab: 'cardapio'
      });
    }
    if (cardapio.workflow.status !== 'FINALIZADO') {
      alerts.push({
        id: `cardapio-workflow-${cardapio.id}`,
        severity: selected.upcoming ? 'info' : 'warning',
        title: selected.upcoming ? 'Próximo cardápio ainda não finalizado' : 'Cardápio vigente ainda não finalizado',
        detail: `Status atual: ${cardapio.workflow.status.replaceAll('_', ' ')}.`,
        module: 'Cardápio',
        actionTab: 'cardapio'
      });
    }
    if (zeroQuantityItems.length) {
      alerts.push({
        id: `meat-zero-${cardapio.id}`,
        severity: 'critical',
        title: `${zeroQuantityItems.length} item(ns) de carne sem quantidade válida`,
        detail: 'Há corte selecionado com quantidade igual a zero no Saque de Carnes.',
        module: 'Saque',
        actionTab: 'cardapio'
      });
    }
    if (meatToday.length) {
      alerts.push({
        id: `meat-today-${cardapio.id}`,
        severity: 'info',
        title: `Retirada de ${meatKgToday.toLocaleString('pt-BR')} kg de carnes hoje`,
        detail: `${meatToday.length} item(ns) programado(s) para retirada e descongelamento.`,
        module: 'Saque',
        actionTab: 'cardapio'
      });
    }
  }

  if (params.rosterPending || params.cardapioPending) {
    alerts.unshift({
      id: 'sync-pending',
      severity: 'warning',
      title: 'Há alterações aguardando confirmação do servidor',
      detail: 'Evite emitir documentos oficiais até a sincronização ser concluída.',
      module: 'Sincronização'
    });
  }

  const severityWeight = { critical: 0, warning: 1, info: 2 } as const;
  alerts.sort((a, b) => severityWeight[a.severity] - severityWeight[b.severity]);

  return {
    today,
    availableMilitary,
    absentMilitary,
    vacantPostsNext7,
    servicesToday,
    meatKgToday,
    meatItemsToday: meatToday.length,
    cardapio,
    cardapioIsUpcoming: selected.upcoming,
    cardapioReadiness: readiness?.percent ?? null,
    alerts
  };
}

const severityStyles = {
  critical: 'bg-rose-50 border-rose-200 text-rose-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-sky-50 border-sky-200 text-sky-900'
};

const severityDot = {
  critical: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500'
};

export function OperationalAlertsPanel({
  alerts,
  onNavigate,
  onClose
}: {
  alerts: OperationalAlert[];
  onNavigate: (tab: OperationalTab) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-12 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Central de Alertas</p>
          <p className="text-[11px] text-slate-500">{alerts.length} ocorrência(s) operacional(is)</p>
        </div>
        <button onClick={onClose} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Fechar</button>
      </div>
      <div className="max-h-[440px] overflow-y-auto p-2">
        {alerts.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-800">Nenhuma pendência operacional</p>
            <p className="text-xs text-slate-500 mt-1">Os módulos monitorados não apresentam alertas agora.</p>
          </div>
        ) : alerts.map(alert => (
          <button
            key={alert.id}
            onClick={() => {
              if (alert.actionTab) onNavigate(alert.actionTab);
              onClose();
            }}
            className="w-full text-left px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors flex gap-3"
          >
            <span className={cn('mt-1.5 w-2.5 h-2.5 rounded-full shrink-0', severityDot[alert.severity])} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">{alert.title}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">{alert.module}</span>
              </span>
              <span className="block text-[11px] leading-relaxed text-slate-500 mt-1">{alert.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </button>
  );
}

export default function OperationalDashboard({
  snapshot,
  calendarDays,
  onNavigate
}: {
  snapshot: OperationalSnapshot;
  calendarDays: OperationalCalendarDay[];
  onNavigate: (tab: OperationalTab) => void;
}) {
  const statusLabel = snapshot.cardapio?.workflow.status.replaceAll('_', ' ') || 'SEM CARDÁPIO';

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Central Operacional</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Visão do dia</h3>
          <p className="text-sm text-slate-500 capitalize mt-1">{formatLongDate(snapshot.today)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onNavigate('dashboard')} className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">Abrir Escalas</button>
          <button onClick={() => onNavigate('afastamentos')} className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">Afastamentos</button>
          <button onClick={() => onNavigate('cardapio')} className="px-3.5 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900">Cardápio e Saque</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard icon={UserCheck} label="Efetivo disponível" value={snapshot.availableMilitary} detail={`${snapshot.absentMilitary} afastado(s) hoje`} onClick={() => onNavigate('efetivo')} />
        <MetricCard icon={CircleAlert} label="Postos vagos" value={snapshot.vacantPostsNext7} detail="Próximos 7 dias de escala" attention={snapshot.vacantPostsNext7 > 0} onClick={() => onNavigate('dashboard')} />
        <MetricCard icon={Beef} label="Saque de carnes hoje" value={`${snapshot.meatKgToday.toLocaleString('pt-BR')} kg`} detail={`${snapshot.meatItemsToday} item(ns) para retirada`} onClick={() => onNavigate('cardapio')} />
        <MetricCard icon={UtensilsCrossed} label="Prontidão do cardápio" value={snapshot.cardapioReadiness === null ? '—' : `${snapshot.cardapioReadiness}%`} detail={statusLabel} attention={(snapshot.cardapioReadiness ?? 100) < 100} onClick={() => onNavigate('cardapio')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <section className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900">Prioridades operacionais</h4>
              <p className="text-xs text-slate-500 mt-0.5">Pendências e eventos que exigem atenção.</p>
            </div>
            <span className="text-xs font-bold text-slate-500">{snapshot.alerts.length}</span>
          </div>
          <div className="p-3 space-y-2">
            {snapshot.alerts.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-800">Operação sem pendências detectadas</p>
                <p className="text-xs text-slate-500 mt-1">Nenhum alerta foi gerado para os módulos monitorados.</p>
              </div>
            ) : snapshot.alerts.slice(0, 6).map(alert => (
              <button
                key={alert.id}
                onClick={() => alert.actionTab && onNavigate(alert.actionTab)}
                className={cn('w-full p-3.5 rounded-xl border text-left flex items-start gap-3 hover:shadow-sm transition-all', severityStyles[alert.severity])}
              >
                {alert.severity === 'critical' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : alert.severity === 'warning' ? <Clock3 className="w-4 h-4 mt-0.5 shrink-0" /> : <CalendarClock className="w-4 h-4 mt-0.5 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-bold block">{alert.title}</span>
                  <span className="text-[11px] opacity-80 block mt-0.5 leading-relaxed">{alert.detail}</span>
                </span>
                {alert.actionTab && <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />}
              </button>
            ))}
          </div>
        </section>

        <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h4 className="font-bold text-slate-900">Serviço de hoje</h4>
            <p className="text-xs text-slate-500 mt-0.5">Escala cadastrada para a data atual.</p>
          </div>
          <div className="p-4 space-y-2">
            {snapshot.servicesToday.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Sem serviço cadastrado hoje</p>
                <p className="text-xs text-slate-500 mt-1">A escala atual contempla finais de semana e feriados cadastrados.</p>
              </div>
            ) : snapshot.servicesToday.map(item => (
              <div key={item.post} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{item.post}</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{item.rank} {item.military}</p>
                </div>
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </div>
            ))}
            <button onClick={() => onNavigate('dashboard')} className="w-full mt-2 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors">Gerenciar escala</button>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-700">
                <UtensilsCrossed className="w-4 h-4" />
                <h4 className="font-bold text-sm">Cardápio monitorado</h4>
              </div>
              {snapshot.cardapio ? (
                <>
                  <p className="text-lg font-bold text-slate-900 mt-3">{formatDate(snapshot.cardapio.dataInicio)} a {formatDate(snapshot.cardapio.dataFim)}</p>
                  <p className="text-xs text-slate-500 mt-1">{snapshot.cardapioIsUpcoming ? 'Próxima semana disponível' : 'Semana vigente / mais recente'} · {statusLabel}</p>
                </>
              ) : <p className="text-sm text-slate-500 mt-3">Nenhum cardápio disponível.</p>}
            </div>
            <button onClick={() => onNavigate('cardapio')} className="text-xs font-bold text-emerald-800 hover:text-emerald-950">Abrir</button>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-700">
                <UserX className="w-4 h-4" />
                <h4 className="font-bold text-sm">Situação do efetivo</h4>
              </div>
              <p className="text-lg font-bold text-slate-900 mt-3">{snapshot.availableMilitary} disponíveis</p>
              <p className="text-xs text-slate-500 mt-1">{snapshot.absentMilitary} militar(es) afastado(s) na data atual.</p>
            </div>
            <button onClick={() => onNavigate('afastamentos')} className="text-xs font-bold text-emerald-800 hover:text-emerald-950">Detalhar</button>
          </div>
        </section>
      </div>

      <OperationalCalendar days={calendarDays} onNavigate={onNavigate} />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  attention = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  detail: string;
  attention?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={cn('w-full text-left rounded-2xl border bg-white p-4 shadow-sm transition-all', onClick && 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer', attention ? 'border-amber-200' : 'border-slate-200')}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className={cn('p-2 rounded-lg', attention ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}><Icon className="w-4 h-4" /></span>
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-3">{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{detail}</div>
    </div>
  );
}
