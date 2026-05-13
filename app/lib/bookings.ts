// Centralized booking store + validation.
// All API routes go through this so file IO is atomic + serialized.

import { JsonStore } from './data-store';

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  message: string;
  status: 'pending' | 'confirmed' | 'declined';
  createdAt: string;
}

const STATUSES = ['pending', 'confirmed', 'declined'] as const;

export function isBooking(x: unknown): x is Booking {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    typeof b.name === 'string' &&
    typeof b.email === 'string' &&
    typeof b.phone === 'string' &&
    typeof b.checkIn === 'string' &&
    typeof b.checkOut === 'string' &&
    typeof b.guests === 'string' &&
    typeof b.message === 'string' &&
    typeof b.status === 'string' && (STATUSES as readonly string[]).includes(b.status) &&
    typeof b.createdAt === 'string'
  );
}

export const bookingsStore = new JsonStore<Booking[]>({
  filename: 'bookings.json',
  defaultValue: [],
  validate: (raw): Booking[] => {
    if (!Array.isArray(raw)) {
      console.warn('[bookings] expected array, got', typeof raw, '— treating as empty');
      return [];
    }
    const good: Booking[] = [];
    for (const item of raw) {
      if (isBooking(item)) good.push(item);
      else console.warn('[bookings] dropping malformed row:', JSON.stringify(item).slice(0, 200));
    }
    return good;
  },
});

export type BookingInput = Omit<Booking, 'id' | 'createdAt' | 'status'> & {
  status?: Booking['status'];
};

// Shared validator. Returns null if OK, or an error message string.
export function validateBookingInput(b: Partial<BookingInput>): string | null {
  if (!b.name || typeof b.name !== 'string' || b.name.trim().length < 2) return 'name required';
  if (!b.email || typeof b.email !== 'string' || !/^\S+@\S+\.\S+$/.test(b.email)) return 'valid email required';
  if (!b.phone || typeof b.phone !== 'string' || b.phone.trim().length < 5) return 'phone required';
  if (!b.checkIn || typeof b.checkIn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.checkIn)) return 'checkIn must be YYYY-MM-DD';
  if (!b.checkOut || typeof b.checkOut !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.checkOut)) return 'checkOut must be YYYY-MM-DD';
  if (b.checkOut <= b.checkIn) return 'checkOut must be after checkIn';
  if (!b.guests || typeof b.guests !== 'string') return 'guests required';
  if (b.status !== undefined && !(STATUSES as readonly string[]).includes(b.status)) {
    return 'status must be pending | confirmed | declined';
  }
  return null;
}

export type BookingPatch = Partial<Omit<Booking, 'id' | 'createdAt'>>;

export function validateBookingPatch(p: BookingPatch): string | null {
  if (p.name !== undefined && (typeof p.name !== 'string' || p.name.trim().length < 2)) {
    return 'name must be at least 2 characters';
  }
  if (p.email !== undefined && (typeof p.email !== 'string' || !/^\S+@\S+\.\S+$/.test(p.email))) {
    return 'email must be valid';
  }
  if (p.phone !== undefined && (typeof p.phone !== 'string' || p.phone.trim().length < 5)) {
    return 'phone must be at least 5 characters';
  }
  if (p.checkIn !== undefined && (typeof p.checkIn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.checkIn))) {
    return 'checkIn must be YYYY-MM-DD';
  }
  if (p.checkOut !== undefined && (typeof p.checkOut !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.checkOut))) {
    return 'checkOut must be YYYY-MM-DD';
  }
  if (p.status !== undefined && !(STATUSES as readonly string[]).includes(p.status as string)) {
    return 'status must be pending | confirmed | declined';
  }
  if (p.guests !== undefined && (typeof p.guests !== 'string' || p.guests.length === 0)) {
    return 'guests must be a non-empty string';
  }
  if (p.message !== undefined && typeof p.message !== 'string') {
    return 'message must be a string';
  }
  return null;
}
