import { NextRequest, NextResponse } from 'next/server';
import { bookings as bookingsRepo } from '@/app/lib/store-factory';
import { validateBookingPatch, type BookingPatch } from '@/app/lib/bookings';

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
// /confirm and /decline.
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

  // Cross-field invariant has to be checked against the merged row, which
  // means we need the current state first.
  let current;
  try {
    current = await bookingsRepo.get(id);
  } catch (e) {
    console.error('patch read failed:', e);
    return NextResponse.json({ error: 'could not read booking' }, { status: 503 });
  }
  if (!current) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  const merged = { ...current, ...patch };
  if (merged.checkOut <= merged.checkIn) {
    return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400 });
  }

  try {
    const result = await bookingsRepo.patch(id, patch);
    if (!result) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ success: true, booking: result });
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
    const deleted = await bookingsRepo.delete(id);
    if (!deleted) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ success: true, deleted: id });
  } catch (e) {
    console.error('delete booking failed:', e);
    return NextResponse.json({ error: 'could not delete booking' }, { status: 503 });
  }
}
