// src/modules/reports/utils/report-time.util.ts
import { DateTime } from 'luxon';

export const TZ = 'Asia/Ho_Chi_Minh';

export function getRange(range: 'week' | 'month', anchorDate?: string) {
  const base = anchorDate
    ? DateTime.fromISO(anchorDate, { zone: TZ }).startOf('day')
    : DateTime.now().setZone(TZ).startOf('day');

  if (range === 'week') {
    // ISO week starts Monday
    const start = base.startOf('week'); // Luxon uses locale week by default, BUT in ISO it should work with setLocale?
    // To be explicit ISO: go to Monday using weekday (1=Mon..7=Sun)
    const isoStart = base.minus({ days: base.weekday - 1 }).startOf('day');
    const isoEndExclusive = isoStart.plus({ days: 7 }); // [start, end)
    return {
      from: isoStart.toJSDate(),
      to: isoEndExclusive.toJSDate(),
      label: `${isoStart.toISODate()}..${isoEndExclusive.minus({ days: 1 }).toISODate()}`,
      isoStart,
      isoEndExclusive,
    };
  }

  // month
  const monthStart = base.startOf('month');
  const monthEndExclusive = monthStart.plus({ months: 1 }); // [start, end)
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
    out.push(cur.toISODate()!); // YYYY-MM-DD
    cur = cur.plus({ days: 1 });
  }
  return out;
}

export function isoWeekKey(dt: DateTime) {
  // returns {year, week}
  return { year: dt.weekYear, week: dt.weekNumber };
}

export function isoWeeksInMonth(monthStart: DateTime) {
  // Produce unique iso-week buckets that intersect the month
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

  // sort increasing
  weeks.sort((a, b) => (a.year - b.year) || (a.week - b.week));
  return weeks;
}
