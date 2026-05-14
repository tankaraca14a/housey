import { NextRequest, NextResponse } from 'next/server';
import { bookings as bookingsRepo } from '@/app/lib/store-factory';
import { validateBookingInput, findConflict, type Booking } from '@/app/lib/bookings';

// Source of truth for the admin password is the ADMIN_PASSWORD env var.
// The literal fallback is only for local dev where the env var isn't set;
// it matches the historical value so existing tests + Ivana's bookmarked
// browser sessions keep working. Rotate by setting ADMIN_PASSWORD in
// Vercel project settings → Environment Variables → Production.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

function requireAdmin(request: NextRequest): NextResponse | null {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const rows = await bookingsRepo.list();
    return NextResponse.json({ bookings: rows });
  } catch (e) {
    console.error('list bookings failed:', e);
    return NextResponse.json({ error: 'could not list bookings' }, { status: 503 });
  }
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
  const err = validateBookingInput({
    name, email, phone, checkIn, checkOut, guests,
    status: status as Booking['status'] | undefined,
  });
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  // Overlap check, unless ?force=1 (escape hatch for manual / phone bookings
  // Ivana intentionally wants to record alongside an existing one).
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';
  if (!force && status !== 'declined') {
    const current = await bookingsRepo.list();
    const conflict = findConflict(current, checkIn, checkOut);
    if (conflict) {
      return NextResponse.json({
        error: `Conflicts with booking ${conflict.id} (${conflict.checkIn} → ${conflict.checkOut}, ${conflict.status}). Use ?force=1 to override.`,
        conflict: { id: conflict.id, checkIn: conflict.checkIn, checkOut: conflict.checkOut, status: conflict.status },
      }, { status: 409 });
    }
  }

  try {
    const booking = await bookingsRepo.create({
      name,
      email,
      phone,
      checkIn,
      checkOut,
      guests,
      message: message ?? '',
      status: (status as Booking['status']) ?? 'pending',
    });
    return NextResponse.json({ success: true, booking });
  } catch (e) {
    console.error('admin booking create failed:', e);
    return NextResponse.json({ error: 'could not save booking' }, { status: 503 });
  }
}
