import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { bookings as bookingsRepo } from '@/app/lib/store-factory';
import { validateBookingInput, findConflict, type Booking } from '@/app/lib/bookings';

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

  const { name, email, phone, checkIn, checkOut, guests, message, lang } = body as Record<string, string>;
  const err = validateBookingInput({ name, email, phone, checkIn, checkOut, guests });
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }
  // Narrow the guest's chosen language to our 5-lang set; default to 'en'
  // for any other value (back-compat, defensive against typos in old clients).
  const guestLang: 'en' | 'hr' | 'de' | 'it' | 'fr' =
    (['en', 'hr', 'de', 'it', 'fr'] as const).includes(lang as 'en' | 'hr' | 'de' | 'it' | 'fr')
      ? (lang as 'en' | 'hr' | 'de' | 'it' | 'fr')
      : 'en';

  // Persist FIRST. A failure here is a real save failure (KV down, etc.) —
  // we MUST not lose bookings, so reject with 503 and let the client retry.
  let saved: Booking;
  try {
    // Duplicate guard. Race-safe enough for the volume this site sees: if
    // two identical POSTs land in the same millisecond, both might pass
    // the check and create rows, but the dup guard's window is 5 minutes
    // and that's fine in practice.
    const current = await bookingsRepo.list();
    if (isDuplicate(current, { email, checkIn, checkOut })) {
      return NextResponse.json({ success: true, duplicate: true });
    }
    // Reject overlap with any existing non-declined booking. Two guests
    // for the same nights would otherwise both land as 'pending' and
    // Ivana would have to manually decline one. The error message names
    // the conflicting range so the guest can pick different dates.
    const conflict = findConflict(current, checkIn, checkOut);
    if (conflict) {
      return NextResponse.json({
        error: `Those dates overlap an existing reservation (${conflict.checkIn} → ${conflict.checkOut}). Please pick different dates.`,
        conflict: { checkIn: conflict.checkIn, checkOut: conflict.checkOut },
      }, { status: 409 });
    }
    saved = await bookingsRepo.create({
      name,
      email,
      phone,
      checkIn,
      checkOut,
      guests,
      message: message ?? '',
      status: 'pending',
      lang: guestLang,
    });
  } catch (e) {
    console.error('booking persist failed:', e);
    return NextResponse.json({ error: 'could not save booking' }, { status: 503 });
  }

  // Best-effort notification email. Booking is already saved.
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
  }

  return NextResponse.json({ success: true, id: saved.id, emailSent, emailError });
}
