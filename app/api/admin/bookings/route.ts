import { NextRequest, NextResponse } from 'next/server';
import {
  bookingsStore,
  validateBookingInput,
  type Booking,
} from '@/app/lib/bookings';

const ADMIN_PASSWORD = 'ivana2026';

function requireAdmin(request: NextRequest): NextResponse | null {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const bookings = await bookingsStore.read();
  return NextResponse.json({ bookings });
}

// Admin-side manual booking creation (phone / walk-in). Skips Resend email
// (admin emails the guest separately if needed). Accepts an initial status
// so a phone reservation can be recorded straight as 'confirmed'.
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { name, email, phone, checkIn, checkOut, guests, message, status } = body as Record<string, string>;
  const err = validateBookingInput({ name, email, phone, checkIn, checkOut, guests, status: status as Booking['status'] | undefined });
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const booking = await bookingsStore.update<Booking>((current) => {
      const next: Booking = {
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        checkIn,
        checkOut,
        guests,
        message: message ?? '',
        status: (status as Booking['status']) ?? 'pending',
        createdAt: new Date().toISOString(),
      };
      return { next: [...current, next], result: next };
    });
    return NextResponse.json({ success: true, booking });
  } catch (e) {
    console.error('admin booking create failed:', e);
    return NextResponse.json({ error: 'could not save booking' }, { status: 503 });
  }
}
