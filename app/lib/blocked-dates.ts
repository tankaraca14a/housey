import { JsonStore } from './data-store';

export const blockedDatesStore = new JsonStore<string[]>({
  filename: 'blocked-dates.json',
  defaultValue: [],
  validate: (raw): string[] => {
    if (!Array.isArray(raw)) {
      console.warn('[blocked-dates] expected array, got', typeof raw, '— treating as empty');
      return [];
    }
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const good = raw.filter((d): d is string => typeof d === 'string' && dateRe.test(d));
    if (good.length !== raw.length) {
      console.warn(`[blocked-dates] dropped ${raw.length - good.length} malformed entries`);
    }
    return good;
  },
});
