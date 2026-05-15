import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { bookings as bookingsRepo } from '@/app/lib/store-factory';
import { declineEmail } from '@/app/lib/i18n/emails';

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
      // Render the decline body in the guest's recorded language.
      const { subject, html } = declineEmail(booking);
      const { error } = await resend.emails.send({
        from: 'Housey <noreply@tankaraca.com>',
        to: [booking.email],
        subject,
        html,
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
