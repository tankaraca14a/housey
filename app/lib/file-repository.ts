// File-backed implementations of BookingsRepository and BlockedDatesRepository.
// Uses the resilient JsonStore (atomic writes + in-process mutex + schema
// validation on read). Only works where the filesystem is writable — fine
// for local dev, OK for VM/persistent-disk deploys, BROKEN on Vercel
// serverless (read-only fs). On Vercel, use kv-repository.ts instead.

import { JsonStore } from './data-store';
import type { Booking } from './bookings';
import { isBooking } from './bookings';
import type { BookingsRepository, BlockedDatesRepository } from './repository';

const bookingsStore = new JsonStore<Booking[]>({
  filename: 'bookings.json',
  defaultValue: [],
  validate: (raw): Booking[] => {
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).filter(isBooking);
  },
});

const blockedStore = new JsonStore<string[]>({
  filename: 'blocked-dates.json',
  defaultValue: [],
  validate: (raw): string[] => {
    if (!Array.isArray(raw)) return [];
    const re = /^\d{4}-\d{2}-\d{2}$/;
    return (raw as unknown[]).filter((d): d is string => typeof d === 'string' && re.test(d));
  },
});

export const fileBookingsRepository: BookingsRepository = {
  async list() {
    return await bookingsStore.read();
  },
  async get(id) {
    const all = await bookingsStore.read();
    return all.find((b) => b.id === id) ?? null;
  },
  async create(input) {
    const booking: Booking = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await bookingsStore.update((current) => ({ next: [...current, booking] }));
    return booking;
  },
  async patch(id, patch) {
    let result: Booking | null = null;
    await bookingsStore.update((current) => {
      const idx = current.findIndex((b) => b.id === id);
      if (idx === -1) return { next: current };
      const merged = { ...current[idx], ...patch };
      const next = [...current];
      next[idx] = merged;
      result = merged;
      return { next };
    });
    return result;
  },
  async delete(id) {
    let deleted = false;
    await bookingsStore.update((current) => {
      const filtered = current.filter((b) => b.id !== id);
      deleted = filtered.length !== current.length;
      return { next: filtered };
    });
    return deleted;
  },
};

export const fileBlockedDatesRepository: BlockedDatesRepository = {
  async list() {
    return await blockedStore.read();
  },
  async set(dates) {
    await blockedStore.write(dates);
  },
  async addMany(dates) {
    let merged: string[] = [];
    await blockedStore.update((current) => {
      merged = Array.from(new Set([...current, ...dates])).sort();
      return { next: merged };
    });
    return merged;
  },
};
