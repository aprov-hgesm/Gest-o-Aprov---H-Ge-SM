export type AbsenceStatus = 'ATIVO' | 'AGENDADO' | 'ENCERRADO' | 'CANCELADO';

export interface AbsenceLike {
  militaryId: string;
  startDate: string;
  endDate: string;
  indefinite: boolean;
  status: AbsenceStatus;
  actualEndDate?: string;
}

export interface MilitaryLike {
  id: string;
  status: 'Ativo' | 'Afastado';
  dutyCount: number;
}

export interface RosterCellLike {
  militaryId: string;
  type: 'EP' | 'EV' | 'PERM' | 'DISP';
}

export type RosterLike = Record<string, Record<string, RosterCellLike | null>>;

export function localIsoDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function resolveAbsenceStatus(absence: AbsenceLike, referenceIso = localIsoDate()): AbsenceStatus {
  if (absence.status === 'CANCELADO') return 'CANCELADO';
  if (absence.status === 'ENCERRADO' || absence.actualEndDate) return 'ENCERRADO';
  if (referenceIso < absence.startDate) return 'AGENDADO';
  if (absence.indefinite) return 'ATIVO';
  return referenceIso <= absence.endDate ? 'ATIVO' : 'ENCERRADO';
}

export function isAbsenceCoveringDate(absence: AbsenceLike, dateIso: string): boolean {
  if (absence.status === 'CANCELADO') return false;
  if (dateIso < absence.startDate) return false;
  if (absence.actualEndDate) return dateIso <= absence.actualEndDate;
  if (absence.indefinite) return absence.status !== 'ENCERRADO';
  return dateIso <= absence.endDate;
}

export function isMilitaryAbsentOnDate(absences: AbsenceLike[], militaryId: string, dateIso: string): boolean {
  return absences.some(absence => absence.militaryId === militaryId && isAbsenceCoveringDate(absence, dateIso));
}

export function normalizeMilitaryStatuses<T extends MilitaryLike, A extends AbsenceLike>(
  military: T[],
  absences: A[],
  referenceIso = localIsoDate(),
): T[] {
  return military.map(item => ({
    ...item,
    status: isMilitaryAbsentOnDate(absences, item.id, referenceIso) ? 'Afastado' : 'Ativo',
  }));
}

export function recalculateDutyCounts<T extends MilitaryLike>(military: T[], roster: RosterLike): T[] {
  const counts = new Map<string, number>();
  Object.values(roster).forEach(day => {
    Object.values(day).forEach(cell => {
      if (!cell || cell.type === 'DISP') return;
      counts.set(cell.militaryId, (counts.get(cell.militaryId) ?? 0) + 1);
    });
  });
  return military.map(item => ({ ...item, dutyCount: counts.get(item.id) ?? 0 }));
}

export function rosterCompliance(roster: RosterLike) {
  const cells = Object.values(roster).flatMap(day => Object.values(day));
  const total = cells.length;
  const filled = cells.filter(cell => cell !== null && cell.type !== 'DISP').length;
  return { total, filled, rate: total > 0 ? Math.round((filled / total) * 100) : 100 };
}
