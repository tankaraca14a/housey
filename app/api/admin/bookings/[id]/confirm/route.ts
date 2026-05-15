import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { bookings as bookingsRepo, blockedDates as blockedRepo } from '@/app/lib/store-factory';
import { recordAudit } from '@/app/lib/blocked-dates-audit';
import { confirmEmail } from '@/app/lib/i18n/emails';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

// Block the nights the guest is actually sleeping there: [checkIn, checkOut).
// Checkout day is exclusive so the next guest can arrive the same day.
function getDatesInRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const end = new Date(checkOut);
  const current = new Date(checkIn);
  while (current < end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  let booking;
  try {
    booking = await bookingsRepo.patch(id, { status: 'confirmed' });
  } catch (e) {
    console.error('confirm: persist failed', e);
    return NextResponse.json({ error: 'could not save booking' }, { status: 503 });
  }
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  // Each side-effect (block dates, send email) is best-effort and returns
  // its own status in the response. Booking is already confirmed in KV;
  // failure here doesn't roll that back, the admin just sees a partial
  // success indicator and can fix the gap manually.
  let datesBlocked = false;
  let blockedDatesError: string | null = null;
  try {
    const newDates = getDatesInRange(booking.checkIn, booking.checkOut);
    const beforeSet = new Set(await blockedRepo.list());
    await blockedRepo.addMany(newDates);
    datesBlocked = true;

    // Audit the auto-block so a later report can prove these dates came
    // from a Confirm action (not a manual click and not test residue).
    const added = newDates.filter((d) => !beforeSet.has(d));
    if (added.length > 0) {
      const ts = new Date().toISOString();
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
      const ua = request.headers.get('user-agent') || 'unknown';
      await recordAudit(
        added.map((date) => ({
          ts, action: 'block' as const, date, source: 'confirm' as const,
          bookingId: booking.id, ip, ua,
        })),
      );
    }
  } catch (e) {
    blockedDatesError = e instanceof Error ? e.message : String(e);
    console.error('confirm: blocked-dates persist failed (booking still confirmed)', e);
  }

  let emailSent = false;
  let emailError: string | null = null;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      // Build the body in the guest's chosen language (recorded on the
      // booking row at POST time). Falls back to EN for older rows that
      // pre-date i18n.
      const { subject, html } = confirmEmail(booking);
      const { error } = await resend.emails.send({
        from: 'Housey <noreply@tankaraca.com>',
        to: [booking.email],
        subject,
        html,
      });
      if (error) {
        emailError = typeof error === 'string' ? error : JSON.stringify(error);
        console.error('confirm: email send returned error (booking still confirmed)', error);
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
      console.error('confirm: email failed (booking still confirmed)', e);
    }
  } else {
    emailError = 'RESEND_API_KEY not configured';
  }

  return NextResponse.json({
    success: true,
    datesBlocked,
    blockedDatesError,
    emailSent,
    emailError,
  });
}
