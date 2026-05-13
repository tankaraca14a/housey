import { NextRequest, NextResponse } from 'next/server';
import {
  bookingsStore,
  validateBookingPatch,
  type BookingPatch,
} from '@/app/lib/bookings';

const ADMIN_PASSWORD = 'ivana2026';
const ALLOWED_FIELDS = ['name', 'email', 'phone', 'checkIn', 'checkOut', 'guests', 'message', 'status'] as const;

function requireAdmin(request: NextRequest): NextResponse | null {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// Partial update of any booking field, including status. Lets the admin
// edit contact info / shift dates / move status in any direction.
// Does NOT email and does NOT touch blocked-dates — those flows live in
// /confirm and /decline (still available as ergonomic shortcuts for the
// pending → confirmed/declined transitions).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const patch: BookingPatch = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) (patch as Record<string, unknown>)[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no patchable fields in body' }, { status: 400 });
  }

  const err = validateBookingPatch(patch);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const outcome = await bookingsStore.update<{ ok: true; booking: ReturnType<typeof Object.assign> } | { ok: false; status: number; error: string }>((current) => {
      const idx = current.findIndex((b) => b.id === id);
      if (idx === -1) {
        return { next: current, result: { ok: false, status: 404, error: 'Booking not found' } };
      }
      const merged = { ...current[idx], ...patch };
      if (merged.checkOut <= merged.checkIn) {
        return { next: current, result: { ok: false, status: 400, error: 'checkOut must be after checkIn' } };
      }
      const nextList = [...current];
      nextList[idx] = merged;
      return { next: nextList, result: { ok: true, booking: merged } };
    });

    if (!outcome) {
      return NextResponse.json({ error: 'unknown error' }, { status: 500 });
    }
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    return NextResponse.json({ success: true, booking: outcome.booking });
  } catch (e) {
    console.error('patch booking failed:', e);
    return NextResponse.json({ error: 'could not save booking' }, { status: 503 });
  }
}

// Permanently removes a booking row. Does NOT unblock dates — if the booking
// was previously confirmed and its dates were auto-added to blocked-dates,
// those stay blocked until the admin un-clicks them on the calendar. This
// is deliberate: it prevents accidental delete from re-exposing the dates.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  try {
    const outcome = await bookingsStore.update<{ ok: true; deleted: string } | { ok: false }>((current) => {
      const filtered = current.filter((b) => b.id !== id);
      if (filtered.length === current.length) {
        return { next: current, result: { ok: false } };
      }
      return { next: filtered, result: { ok: true, deleted: id } };
    });

    if (!outcome || !outcome.ok) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: outcome.deleted });
  } catch (e) {
    console.error('delete booking failed:', e);
    return NextResponse.json({ error: 'could not delete booking' }, { status: 503 });
  }
}
