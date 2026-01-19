import { DateTime } from 'luxon';

export const TZ = 'Asia/Ho_Chi_Minh';

export function getRange(range: 'week' | 'month', anchorDate?: string) {
  const base = anchorDate
    ? DateTime.fromISO(anchorDate, { zone: TZ }).startOf('day')
    : DateTime.now().setZone(TZ).startOf('day');

  if (range === 'week') {
    const start = base.startOf('week');
    const isoStart = base.minus({ days: base.weekday - 1 }).startOf('day');
    const isoEndExclusive = isoStart.plus({ days: 7 });
    return {
      from: isoStart.toJSDate(),
      to: isoEndExclusive.toJSDate(),
      label: `${isoStart.toISODate()}..${isoEndExclusive.minus({ days: 1 }).toISODate()}`,
      isoStart,
      isoEndExclusive,
    };
  }

  const monthStart = base.startOf('month');
  const monthEndExclusive = monthStart.plus({ months: 1 });
  return {
    from: monthStart.toJSDate(),
    to: monthEndExclusive.toJSDate(),
    label: `${monthStart.toISODate()}..${monthEndExclusive.minus({ days: 1 }).toISODate()}`,
    monthStart,
    monthEndExclusive,
  };
}

export function daysBetweenInclusive(start: DateTime, endExclusive: DateTime) {
  const out: string[] = [];
  let cur = start;
  while (cur < endExclusive) {
    out.push(cur.toISODate()!);
    cur = cur.plus({ days: 1 });
  }
  return out;
}

export function isoWeekKey(dt: DateTime) {
  return { year: dt.weekYear, week: dt.weekNumber };
}

export function isoWeeksInMonth(monthStart: DateTime) {
  const start = monthStart.startOf('month');
  const endExclusive = start.plus({ months: 1 });

  const weeks: Array<{ year: number; week: number }> = [];
  let cur = start;
  const seen = new Set<string>();

  while (cur < endExclusive) {
    const k = isoWeekKey(cur);
    const id = `${k.year}-W${k.week}`;
    if (!seen.has(id)) {
      seen.add(id);
      weeks.push(k);
    }
    cur = cur.plus({ days: 1 });
  }

  weeks.sort((a, b) => (a.year - b.year) || (a.week - b.week));
  return weeks;
}

export function getPrevRange(range: "week" | "month", anchorDate?: string) {
  const cur = getRange(range, anchorDate);

  const anchor = anchorDate
    ? DateTime.fromISO(anchorDate, { zone: TZ })
    : DateTime.now().setZone(TZ);

  const prevAnchor =
    range === "week" ? anchor.minus({ days: 7 }) : anchor.minus({ months: 1 });

  const prev = getRange(range, prevAnchor.toISODate()!);

  return prev;
}
