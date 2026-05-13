import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { bookings as bookingsRepo } from '@/app/lib/store-factory';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

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
    booking = await bookingsRepo.patch(id, { status: 'declined' });
  } catch (e) {
    console.error('decline: persist failed', e);
    return NextResponse.json({ error: 'could not save booking' }, { status: 503 });
  }
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  // Email is best-effort; status change is already persisted regardless.
  let emailSent = false;
  let emailError: string | null = null;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: 'Housey <noreply@tankaraca.com>',
        to: [booking.email],
        subject: 'Booking Request — Housey, Vela Luka',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #e07b2e;">Booking Request Update</h2>
            <p>Dear ${booking.name},</p>
            <p>Thank you for your interest in staying at <strong>Housey, Vela Luka</strong>.</p>
            <p>Unfortunately, we're unable to accommodate your request for the dates <strong>${booking.checkIn}</strong> to <strong>${booking.checkOut}</strong>, as these dates are not available.</p>
            <p>We'd love to host you on different dates! Please check our availability and feel free to submit a new booking request. We hope to welcome you to Vela Luka soon.</p>
            <p>If you have any questions or would like to discuss alternative dates, don't hesitate to reach out at <a href="mailto:tankaraca14a@gmail.com">tankaraca14a@gmail.com</a>.</p>
            <p>Warm regards,<br><strong>The Housey Team</strong></p>
          </div>
        `,
      });
      if (error) {
        emailError = typeof error === 'string' ? error : JSON.stringify(error);
        console.error('decline: email returned error (booking still declined)', error);
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
      console.error('decline: email failed (booking still declined)', e);
    }
  } else {
    emailError = 'RESEND_API_KEY not configured';
  }

  return NextResponse.json({ success: true, emailSent, emailError });
}
