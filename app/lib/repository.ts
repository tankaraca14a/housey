// Repository abstraction over the bookings + blocked-dates data.
//
// We deploy on Vercel, where the runtime filesystem is read-only. The
// JSON-file backend (FileRepository) is fine for local dev and any
// platform with a writable disk, but for production we need Redis.
//
// This module defines a stable, narrow interface so the API routes don't
// care which backend they're hitting. The factory picks based on env vars:
//
//   - KV_REST_API_URL + KV_REST_API_TOKEN set (Vercel KV / Upstash) → KV
//   - otherwise → file (data/bookings.json, data/blocked-dates.json)
//
// All methods are async. All return defensive copies — callers can mutate
// the result without affecting subsequent reads.

import type { Booking } from './bookings';

export interface BookingsRepository {
  list(): Promise<Booking[]>;
  get(id: string): Promise<Booking | null>;
  create(input: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking>;
  patch(id: string, patch: Partial<Omit<Booking, 'id' | 'createdAt'>>): Promise<Booking | null>;
  delete(id: string): Promise<boolean>;
}

export interface BlockedDatesRepository {
  list(): Promise<string[]>;
  set(dates: string[]): Promise<void>;
  addMany(dates: string[]): Promise<string[]>;
}
