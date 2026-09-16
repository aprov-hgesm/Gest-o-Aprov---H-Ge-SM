import { isMilitaryAbsentOnDate, localIsoDate, type AbsenceStatus } from './roster-integrity.ts';

export type OperationalCalendarTab = 'inicio' | 'dashboard' | 'efetivo' | 'afastamentos' | 'cardapio';

export interface OperationalCalendarCell {
  militaryId: string;
  militaryName: string;
  rank: string;
  type: 'EP' | 'EV' | 'PERM' | 'DISP';
}

export type OperationalCalendarRoster = Record<string, Record<string, OperationalCalendarCell | null>>;

export interface OperationalCalendarAbsence {
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

export interface OperationalCalendarCardapio {
  id: string;
  dataInicio: string;
  dataFim: string;
  workflow: { status: string };
}

export interface OperationalCalendarMeatItem {
  id: string;
  dataSaqueIso: string;
  diaCardapioIso: string;
  quantidadeKg: number;
  tipoCarne: string;
  origem?: string;
}

export interface OperationalCalendarAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  module: 'Escalas' | 'Afastamentos' | 'Cardápio' | 'Saque' | 'Sincronização';
  actionTab?: OperationalCalendarTab;
}

export interface OperationalCalendarDay {
  iso: string;
  weekday: string;
  dayLabel: string;
  isToday: boolean;
  services: Array<{ post: string; military: string; rank: string }>;
  vacancies: string[];
  absenceStarts: string[];
  absenceEnds: string[];
  meatKg: number;
  meatItems: number;
  cardapioStatus?: string;
}

function addDays(iso: string, amount: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + amount);
  return localIsoDate(date);
}

function isoFromRosterKey(value: string) {
  const parts = value.split('/');
  if (parts.length !== 3) return value;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function rosterKeyFromIso(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatShort(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function weekdayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()] || 'Dia';
}

function isWeekend(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const day = new Date(y, (m || 1) - 1, d || 1).getDay();
  return day === 0 || day === 6;
}

export function mergeOperationalAlerts<T extends OperationalCalendarAlert>(alerts: T[]): T[] {
  const seen = new Set<string>();
  const unique = alerts.filter(alert => {
    if (seen.has(alert.id)) return false;
    seen.add(alert.id);
    return true;
  });
  const weight = { critical: 0, warning: 1, info: 2 } as const;
  return unique.sort((a, b) => weight[a.severity] - weight[b.severity]);
}

export function buildOperationalCalendar(params: {
  roster: OperationalCalendarRoster;
  absences: OperationalCalendarAbsence[];
  cardapios: OperationalCalendarCardapio[];
  meatItems: OperationalCalendarMeatItem[];
  today?: string;
  horizonDays?: number;
}) {
  const today = params.today || localIsoDate();
  const horizonDays = Math.max(7, params.horizonDays ?? 14);
  const days: OperationalCalendarDay[] = [];
  const alerts: OperationalCalendarAlert[] = [];

  const rosterByIso = new Map<string, Record<string, OperationalCalendarCell | null>>();
  Object.entries(params.roster).forEach(([key, posts]) => rosterByIso.set(isoFromRosterKey(key), posts));

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const iso = addDays(today, offset);
    const posts = rosterByIso.get(iso) || params.roster[rosterKeyFromIso(iso)];
    const services = posts
      ? Object.entries(posts)
        .filter(([, cell]) => cell && cell.type !== 'DISP')
        .map(([post, cell]) => ({ post, military: cell!.militaryName, rank: cell!.rank }))
      : [];
    const vacancies = posts
      ? Object.entries(posts).filter(([, cell]) => !cell || cell.type === 'DISP').map(([post]) => post)
      : [];

    const absenceStarts = params.absences
      .filter(item => item.status !== 'CANCELADO' && item.startDate === iso)
      .map(item => `${item.rank} ${item.militaryName} — ${item.type}`);
    const absenceEnds = params.absences
      .filter(item => item.status !== 'CANCELADO' && !item.indefinite && (item.actualEndDate || item.endDate) === iso)
      .map(item => `${item.rank} ${item.militaryName} — ${item.type}`);

    const meatForDay = params.meatItems.filter(item => item.dataSaqueIso === iso && item.quantidadeKg > 0);
    const meatKg = meatForDay.reduce((sum, item) => sum + item.quantidadeKg, 0);
    const cardapio = params.cardapios.find(item => item.dataInicio <= iso && item.dataFim >= iso);

    days.push({
      iso,
      weekday: weekdayLabel(iso),
      dayLabel: formatShort(iso),
      isToday: iso === today,
      services,
      vacancies,
      absenceStarts,
      absenceEnds,
      meatKg,
      meatItems: meatForDay.length,
      cardapioStatus: cardapio?.workflow.status,
    });

    services.forEach(service => {
      const cell = posts?.[service.post];
      if (!cell) return;
      if (isMilitaryAbsentOnDate(params.absences, cell.militaryId, iso)) {
        alerts.push({
          id: `roster-absence-conflict-${iso}-${cell.militaryId}-${service.post}`,
          severity: 'critical',
          title: `Militar afastado consta na escala de ${formatShort(iso)}`,
          detail: `${service.rank} ${service.military} está designado para ${service.post}, mas possui afastamento cobrindo a data.`,
          module: 'Escalas',
          actionTab: 'dashboard',
        });
      }
    });

    if (meatForDay.length > 0 && isWeekend(iso)) {
      alerts.push({
        id: `weekend-meat-${iso}`,
        severity: 'warning',
        title: `Retirada de carnes programada para ${weekdayLabel(iso)}`,
        detail: `${meatKg.toLocaleString('pt-BR')} kg em ${meatForDay.length} item(ns) estão previstos para ${formatShort(iso)}. Confirme a data operacional de retirada.`,
        module: 'Saque',
        actionTab: 'cardapio',
      });
    }
  }

  const nextSeven = days.slice(0, 7);
  const uncovered = nextSeven.filter(day => !params.cardapios.some(item => item.dataInicio <= day.iso && item.dataFim >= day.iso));
  if (uncovered.length > 0) {
    alerts.push({
      id: 'cardapio-coverage-next-7',
      severity: 'warning',
      title: 'Há dias sem cardápio cadastrado nos próximos 7 dias',
      detail: `${uncovered.length} dia(s) sem cobertura; primeira ocorrência em ${uncovered[0].dayLabel}.`,
      module: 'Cardápio',
      actionTab: 'cardapio',
    });
  }

  return { days, alerts: mergeOperationalAlerts(alerts) };
}
