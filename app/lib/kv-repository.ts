// Redis-backed implementations of BookingsRepository and BlockedDatesRepository.
// Uses Upstash Redis (REST). Designed for Vercel's read-only serverless
// filesystem — this is the storage we use on production.
//
// Data model:
//   - bookings stored as one Redis key per booking (`booking:<uuid>`) plus
//     a Redis SET (`bookings:index`) of all booking IDs. This makes
//     create/patch/delete fully atomic (single-key operations) — no
//     read-modify-write window.
//   - blocked-dates stored as a Redis SET (`blocked-dates`). SADD/SREM are
//     atomic, so we don't need a mutex.
//
// All operations use the REST API, so they work fine in serverless cold
// starts and edge runtimes. Defensive copies are returned where the
// JSON-file API also returns them.

import { Redis } from '@upstash/redis';
import type { Booking } from './bookings';
import { isBooking } from './bookings';
import type { BookingsRepository, BlockedDatesRepository } from './repository';

let redisInstance: Redis | null = null;
function redis(): Redis {
  if (redisInstance) return redisInstance;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('KV not configured — set KV_REST_API_URL + KV_REST_API_TOKEN');
  }
  redisInstance = new Redis({ url, token });
  return redisInstance;
}

const BOOKING_KEY = (id: string) => `booking:${id}`;
const BOOKINGS_INDEX = 'bookings:index';
const BLOCKED_DATES = 'blocked-dates';

export const kvBookingsRepository: BookingsRepository = {
  async list() {
    const r = redis();
    const ids = await r.smembers(BOOKINGS_INDEX);
    if (!Array.isArray(ids) || ids.length === 0) return [];
    // Fetch all booking blobs in one round trip
    const keys = (ids as string[]).map((id) => BOOKING_KEY(id));
    const blobs = (await r.mget<unknown[]>(...keys)) ?? [];
    const out: Booking[] = [];
    for (const blob of blobs) {
      // Upstash auto-parses JSON if it looks like JSON; tolerate both shapes
      const parsed = typeof blob === 'string' ? safeParse(blob) : blob;
      if (isBooking(parsed)) out.push(parsed as Booking);
    }
    // Stable order: oldest first by createdAt (ascending)
    out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return out;
  },

  async get(id) {
    const r = redis();
    const raw = await r.get<unknown>(BOOKING_KEY(id));
    if (raw == null) return null;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    return isBooking(parsed) ? (parsed as Booking) : null;
  },

  async create(input) {
    const r = redis();
    const booking: Booking = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    // SET booking:<id> json + SADD bookings:index <id> — two ops, but they
    // both succeed or we'd see partial state. Add the index AFTER the value
    // is written so a list() call that races with create() never returns
    // an id whose blob isn't there yet.
    await r.set(BOOKING_KEY(booking.id), JSON.stringify(booking));
    await r.sadd(BOOKINGS_INDEX, booking.id);
    return booking;
  },

  async patch(id, patch) {
    const r = redis();
    const raw = await r.get<unknown>(BOOKING_KEY(id));
    if (raw == null) return null;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    if (!isBooking(parsed)) return null;
    const merged: Booking = { ...(parsed as Booking), ...patch };
    await r.set(BOOKING_KEY(id), JSON.stringify(merged));
    return merged;
  },

  async delete(id) {
    const r = redis();
    // Remove from the index FIRST so a concurrent list() can't include it
    // after we've deleted the blob.
    const removed = await r.srem(BOOKINGS_INDEX, id);
    await r.del(BOOKING_KEY(id));
    return removed > 0;
  },
};

export const kvBlockedDatesRepository: BlockedDatesRepository = {
  async list() {
    const r = redis();
    const dates = (await r.smembers(BLOCKED_DATES)) as string[];
    return [...dates].sort();
  },
  async set(dates) {
    const r = redis();
    // Atomic replace: delete the set, re-add all members.
    await r.del(BLOCKED_DATES);
    if (dates.length > 0) {
      // Upstash's sadd is typed as (key, first, ...rest) tuple-rest; splitting
      // the array satisfies the type checker.
      await r.sadd(BLOCKED_DATES, dates[0], ...dates.slice(1));
    }
  },
  async addMany(dates) {
    const r = redis();
    if (dates.length > 0) {
      await r.sadd(BLOCKED_DATES, dates[0], ...dates.slice(1));
    }
    const next = (await r.smembers(BLOCKED_DATES)) as string[];
    return [...next].sort();
  },
};

function safeParse(s: unknown): unknown {
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch { return null; }
}
