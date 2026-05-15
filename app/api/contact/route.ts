import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Housey Contact <contact@tankaraca.com>',
      to: ['tankaraca14a@gmail.com'],
      replyTo: email,
      // Ivana receives this email — labels in her own language. The
      // visitor's own subject + message stay in whatever language they
      // wrote them (that's their content, not our chrome).
      subject: `Kontakt obrazac: ${subject}`,
      html: `
        <h2>Nova poruka s kontakt obrasca</h2>
        <p><strong>Ime:</strong> ${name}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>Predmet:</strong> ${subject}</p>
        <p><strong>Poruka:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
