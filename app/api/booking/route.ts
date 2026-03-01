import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { promises as fs } from 'fs';
import path from 'path';

const BOOKINGS_FILE = path.join(process.cwd(), 'data', 'bookings.json');

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  message: string;
  status: 'pending' | 'confirmed' | 'declined';
  createdAt: string;
}

async function readBookings(): Promise<Booking[]> {
  try {
    const content = await fs.readFile(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeBookings(bookings: Booking[]): Promise<void> {
  await fs.mkdir(path.dirname(BOOKINGS_FILE), { recursive: true });
  await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, checkIn, checkOut, guests, message } = body;

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email using Resend
    const { data, error } = await resend.emails.send({
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
        ${message ? `<p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>` : ''}
        <hr>
        <p><em>Reply to this email to respond to the guest.</em></p>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Save booking to JSON file
    const booking: Booking = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      checkIn,
      checkOut,
      guests,
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const bookings = await readBookings();
    bookings.push(booking);
    await writeBookings(bookings);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
