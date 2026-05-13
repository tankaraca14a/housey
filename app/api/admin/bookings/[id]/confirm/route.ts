import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { bookingsStore } from '@/app/lib/bookings';
import { blockedDatesStore } from '@/app/lib/blocked-dates';

const ADMIN_PASSWORD = 'ivana2026';

// Block the nights the guest is actually sleeping there: [checkIn, checkOut).
// Checkout day is exclusive so the next guest can arrive the same day
// (matches the guest-side calendar, which treats checkout exclusively).
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

  // Mark confirmed atomically; also compute the dates we need to block.
  let outcome: { ok: true; booking: { id: string; email: string; name: string; checkIn: string; checkOut: string; guests: string } } | { ok: false; error: string };
  try {
    outcome = (await bookingsStore.update<typeof outcome>((current) => {
      const idx = current.findIndex((b) => b.id === id);
      if (idx === -1) {
        return { next: current, result: { ok: false, error: 'Booking not found' } };
      }
      const next = [...current];
      next[idx] = { ...current[idx], status: 'confirmed' };
      return { next, result: { ok: true, booking: next[idx] } };
    }))!;
  } catch (e) {
    console.error('confirm: persist failed', e);
    return NextResponse.json({ error: 'could not save booking' }, { status: 503 });
  }
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 404 });
  }
  const { booking } = outcome;

  // Block dates under the blocked-dates mutex (separate file, separate mutex).
  try {
    const newDates = getDatesInRange(booking.checkIn, booking.checkOut);
    await blockedDatesStore.update((current) => ({
      next: Array.from(new Set([...current, ...newDates])).sort(),
    }));
  } catch (e) {
    console.error('confirm: blocked-dates persist failed (booking still confirmed)', e);
    // Don't fail the request — admin can re-block manually.
  }

  // Best-effort confirmation email.
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Housey <noreply@tankaraca.com>',
        to: [booking.email],
        subject: 'Booking Confirmed — Housey, Vela Luka',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #e07b2e;">Your Booking is Confirmed! 🎉</h2>
            <p>Dear ${booking.name},</p>
            <p>We're thrilled to confirm your booking at <strong>Housey, Vela Luka</strong>. We can't wait to welcome you!</p>

            <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Booking Details</h3>
              <p><strong>Check-in:</strong> ${booking.checkIn} at 16:00</p>
              <p><strong>Check-out:</strong> ${booking.checkOut} at 10:00</p>
              <p><strong>Guests:</strong> ${booking.guests}</p>
            </div>

            <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Address</h3>
              <p>Tankaraca 14a, Vela Luka, Korčula</p>
            </div>

            <p>If you have any questions or need assistance, feel free to reach out to us at <a href="mailto:tankaraca14a@gmail.com">tankaraca14a@gmail.com</a>.</p>
            <p>We look forward to your stay!</p>
            <p>Warm regards,<br><strong>The Housey Team</strong></p>
          </div>
        `,
      });
    } catch (e) {
      console.error('confirm: email failed (booking still confirmed)', e);
    }
  }

  return NextResponse.json({ success: true });
}
