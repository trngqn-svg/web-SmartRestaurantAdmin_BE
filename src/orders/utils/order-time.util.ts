import { DateTime } from 'luxon';

export const TZ = 'Asia/Ho_Chi_Minh';

export function datePresetRange(preset: 'today' | 'yesterday' | 'this_week' | 'this_month') {
  const now = DateTime.now().setZone(TZ);

  if (preset === 'today') {
    const from = now.startOf('day');
    const to = from.plus({ days: 1 });
    return { from: from.toJSDate(), to: to.toJSDate() };
  }

  if (preset === 'yesterday') {
    const to = now.startOf('day');
    const from = to.minus({ days: 1 });
    return { from: from.toJSDate(), to: to.toJSDate() };
  }

  if (preset === 'this_week') {
    const base = now.startOf('day');
    const from = base.minus({ days: base.weekday - 1 }).startOf('day');
    const to = from.plus({ days: 7 });
    return { from: from.toJSDate(), to: to.toJSDate() };
  }

  const from = now.startOf('month');
  const to = from.plus({ months: 1 });
  return { from: from.toJSDate(), to: to.toJSDate() };
}
