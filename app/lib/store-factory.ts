// Pick the right repository backend based on env vars. Reads env at module
// load time so the choice is stable for the lifetime of the process.

import { fileBookingsRepository, fileBlockedDatesRepository } from './file-repository';
import { kvBookingsRepository, kvBlockedDatesRepository } from './kv-repository';
import type { BookingsRepository, BlockedDatesRepository } from './repository';

function kvConfigured(): boolean {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token);
}

export const STORAGE_BACKEND: 'kv' | 'file' = kvConfigured() ? 'kv' : 'file';

export const bookings: BookingsRepository = STORAGE_BACKEND === 'kv'
  ? kvBookingsRepository
  : fileBookingsRepository;

export const blockedDates: BlockedDatesRepository = STORAGE_BACKEND === 'kv'
  ? kvBlockedDatesRepository
  : fileBlockedDatesRepository;

// Visible in server logs once at startup so the operator can confirm
// which backend is active.
console.log(`[storage] backend = ${STORAGE_BACKEND}`);
