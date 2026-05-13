import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { bookings as bookingsRepo, blockedDates as blockedRepo } from '@/app/lib/store-factory';

const ADMIN_PASSWORD = 'ivana2026';

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

  try {
    const newDates = getDatesInRange(booking.checkIn, booking.checkOut);
    await blockedRepo.addMany(newDates);
  } catch (e) {
    console.error('confirm: blocked-dates persist failed (booking still confirmed)', e);
    // Don't fail the request — admin can re-block manually.
  }

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
