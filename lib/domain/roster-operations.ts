export interface OperationalRosterCell {
  militaryId: string;
  militaryName: string;
  rank: string;
  type: 'EP' | 'EV' | 'PERM' | 'DISP';
}

export type OperationalRoster = Record<string, Record<string, OperationalRosterCell | null>>;

export type ScaleDayFilter = 'Todos' | 'Fins de Semana' | 'Feriados';
export type ScaleViewOption = '4 Finais de Semana' | '8 Finais de Semana' | 'Todos' | 'Personalizado';

export interface HolidayLike {
  date: string;
}

export function rosterDayToIso(day: string): string {
  const parts = day.split('/');
  if (parts.length !== 3) return day;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function dateParts(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

export function isWeekendRosterDay(day: string): boolean {
  const { year, month, day: date } = dateParts(rosterDayToIso(day));
  const weekday = new Date(year, (month || 1) - 1, date || 1).getDay();
  return weekday === 0 || weekday === 6;
}

function cloneRoster<T extends OperationalRoster>(roster: T): T {
  return Object.fromEntries(
    Object.entries(roster).map(([day, posts]) => [day, { ...posts }])
  ) as T;
}

/**
 * Adds currently configured posts to every roster day and removes only obsolete EMPTY posts.
 * Any obsolete post that contains a historical assignment is kept for traceability.
 */
export function reconcileRosterPosts<T extends OperationalRoster>(roster: T, activePosts: string[]): T {
  const result = cloneRoster(roster);
  const active = new Set(activePosts);
  Object.values(result).forEach(posts => {
    Object.keys(posts).forEach(post => {
      if (!active.has(post) && posts[post] === null) delete posts[post];
    });
    activePosts.forEach(post => {
      if (!(post in posts)) posts[post] = null;
    });
  });
  return result;
}

/** Clears only the supplied days. Other dates and their historical assignments are untouched. */
export function clearRosterDays<T extends OperationalRoster>(roster: T, targetDays: string[]): T {
  const result = cloneRoster(roster);
  const targets = new Set(targetDays);
  Object.entries(result).forEach(([day, posts]) => {
    if (!targets.has(day)) return;
    Object.keys(posts).forEach(post => { posts[post] = null; });
  });
  return result;
}

/**
 * Removing a weekday holiday may remove its empty roster column, but never destroys a day
 * that already contains an assignment. Weekend roster days are always preserved.
 */
export function removeHolidayRosterDay<T extends OperationalRoster>(roster: T, dayKey: string, isWeekend: boolean) {
  const result = cloneRoster(roster);
  if (isWeekend || !result[dayKey]) return { roster: result, preserved: isWeekend };
  const hasAssignments = Object.values(result[dayKey]).some(cell => cell !== null);
  if (hasAssignments) return { roster: result, preserved: true };
  delete result[dayKey];
  return { roster: result, preserved: false };
}

/**
 * Returns the days that should be shown in the roster grid.
 * "Next 4/8 weekends" is anchored to today instead of the first persisted historical date.
 * Holidays inside the same horizon are preserved when the day filter allows them.
 */
export function selectRosterDays(params: {
  days: string[];
  holidays: HolidayLike[];
  filter: ScaleDayFilter;
  view: ScaleViewOption;
  startIso: string;
  endIso: string;
  todayIso: string;
}): string[] {
  const sorted = [...params.days].sort((a, b) => rosterDayToIso(a).localeCompare(rosterDayToIso(b)));
  const holidaySet = new Set(params.holidays.map(item => item.date));
  const weekendCount = params.view === '4 Finais de Semana' ? 8 : params.view === '8 Finais de Semana' ? 16 : 0;
  let horizonEnd: string | undefined;

  if (weekendCount) {
    const weekends = sorted
      .filter(day => rosterDayToIso(day) >= params.todayIso && isWeekendRosterDay(day))
      .slice(0, weekendCount);
    horizonEnd = weekends.length ? rosterDayToIso(weekends[weekends.length - 1]) : undefined;
  }

  return sorted.filter(day => {
    const iso = rosterDayToIso(day);
    const weekend = isWeekendRosterDay(day);
    const holiday = holidaySet.has(iso);

    if (params.filter === 'Fins de Semana' && !weekend) return false;
    if (params.filter === 'Feriados' && !holiday) return false;

    if (params.view === 'Personalizado') return iso >= params.startIso && iso <= params.endIso;
    if (weekendCount) {
      if (iso < params.todayIso || !horizonEnd) return false;
      return iso <= horizonEnd;
    }
    return true;
  });
}

export function rosterCellDisplayName(cell: OperationalRosterCell): string {
  const raw = cell.militaryName.trim();
  const dotted = `${cell.rank}. `;
  const plain = `${cell.rank} `;
  const cleaned = raw.toLowerCase().startsWith(dotted.toLowerCase())
    ? raw.slice(dotted.length)
    : raw.toLowerCase().startsWith(plain.toLowerCase())
      ? raw.slice(plain.length)
      : raw;
  return `${cell.rank}. ${cleaned}`;
}
