import { DateTime } from "luxon";

export const TZ = "Asia/Ho_Chi_Minh";

export function getTodayRange() {
  const now = DateTime.now().setZone(TZ);
  const from = now.startOf("day");
  const to = from.plus({ days: 1 });
  return { from: from.toJSDate(), to: to.toJSDate(), fromDT: from, toDT: to };
}

export function getYesterdayRange() {
  const now = DateTime.now().setZone(TZ);
  const from = now.startOf("day").minus({ days: 1 });
  const to = from.plus({ days: 1 });
  return { from: from.toJSDate(), to: to.toJSDate(), fromDT: from, toDT: to };
}


export function getThisWeekRange() {
  const now = DateTime.now().setZone(TZ).startOf("day");
  const from = now.minus({ days: now.weekday - 1 }).startOf("day");
  const to = from.plus({ days: 7 });
  return { from: from.toJSDate(), to: to.toJSDate(), fromDT: from, toDT: to };
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
