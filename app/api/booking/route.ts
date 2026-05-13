import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  bookingsStore,
  validateBookingInput,
  type Booking,
} from '@/app/lib/bookings';

// Duplicate guard: same email + same dates within the last 5 minutes is a
// near-certain double-submit, not a second booking.
function isDuplicate(existing: Booking[], candidate: Pick<Booking, 'email' | 'checkIn' | 'checkOut'>): boolean {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  return existing.some((b) =>
    b.email === candidate.email &&
    b.checkIn === candidate.checkIn &&
    b.checkOut === candidate.checkOut &&
    Date.parse(b.createdAt) >= fiveMinAgo
  );
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { name, email, phone, checkIn, checkOut, guests, message } = body as Record<string, string>;

  const err = validateBookingInput({ name, email, phone, checkIn, checkOut, guests });
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  // Persist FIRST under the per-file mutex. The transactional `update` also
  // checks the dup guard atomically — two near-simultaneous identical POSTs
  // can't both succeed.
  let saved: Booking | { duplicate: true };
  try {
    saved = (await bookingsStore.update<Booking | { duplicate: true }>((current) => {
      const candidate: Booking = {
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        checkIn,
        checkOut,
        guests,
        message: message ?? '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      if (isDuplicate(current, candidate)) {
        return { next: current, result: { duplicate: true } };
      }
      return { next: [...current, candidate], result: candidate };
    }))!;
  } catch (e) {
    console.error('booking persist failed:', e);
    return NextResponse.json({ error: 'could not save booking' }, { status: 503 });
  }

  if ('duplicate' in saved) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  // Best-effort notification email. Booking is already on disk; a Resend
  // outage no longer loses the reservation.
  let emailSent = false;
  let emailError: string | null = null;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: 'Housey Bookings <bookings@tankaraca.com>',
        to: ['tankaraca14a@gmail.com'],
        replyTo: email,
        subject: `New Booking Request from ${name}`,
        html: `
          <h2>New Booking Request</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Check-in:</strong> ${checkIn}</p>
          <p><strong>Check-out:</strong> ${checkOut}</p>
          <p><strong>Number of Guests:</strong> ${guests}</p>
          ${message ? `<p><strong>Message:</strong></p><p>${(message as string).replace(/\n/g, '<br>')}</p>` : ''}
          <hr>
          <p><em>Reply to this email to respond to the guest.</em></p>
        `,
      });
      if (error) {
        emailError = typeof error === 'string' ? error : JSON.stringify(error);
        console.error('Resend error (booking saved, email failed):', error);
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
      console.error('Resend threw (booking saved, email failed):', e);
    }
  } else {
    emailError = 'RESEND_API_KEY not configured';
    console.warn('Booking saved without notification — RESEND_API_KEY not set.');
  }

  return NextResponse.json({ success: true, id: saved.id, emailSent, emailError });
}
