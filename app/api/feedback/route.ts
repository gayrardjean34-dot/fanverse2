import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to send feedback.' }, { status: 401 });
    }

    const body = await request.json();
    const { feedback } = body;

    if (!feedback?.trim()) {
      return NextResponse.json({ error: 'Feedback cannot be empty.' }, { status: 400 });
    }

    if (feedback.trim().length > 2000) {
      return NextResponse.json({ error: 'Feedback is too long (max 2000 characters).' }, { status: 400 });
    }

    // Rate limit: 1 feedback per day per user (stored in contact_messages with subject '[FEEDBACK]')
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM contact_messages WHERE user_id = ${user.id} AND subject = '[FEEDBACK]' AND created_at > ${oneDayAgo}`
    );

    const count = Number((recentCount as any)[0]?.count ?? 0);
    if (count >= 1) {
      return NextResponse.json(
        { error: 'You can only send one feedback per day. Thank you for your enthusiasm!' },
        { status: 429 }
      );
    }

    // Store in contact_messages table (reuse existing table, no migration needed)
    await db.execute(
      sql`INSERT INTO contact_messages (user_id, email, subject, message, created_at) VALUES (${user.id}, ${user.email}, '[FEEDBACK]', ${feedback.trim()}, NOW())`
    );

    // Send notification email to admin
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Fanverse <noreply@fanverse.app>',
          to: [process.env.ADMIN_EMAIL],
          subject: `[Fanverse] New User Feedback from ${user.email}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 8px;">
              <h2 style="color: #333;">💬 New Feedback Received</h2>
              <p><strong>From:</strong> ${user.email}</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />
              <p style="font-size: 16px; line-height: 1.6; color: #444;">${feedback.trim().replace(/\n/g, '<br>')}</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />
              <p style="color: #999; font-size: 12px;">Sent via Fanverse feedback form.</p>
            </div>
          `,
        }),
      }).catch((err) => console.error('[Feedback email error]', err));
    } else {
      console.log(`[FEEDBACK] From: ${user.email}\n${feedback.trim()}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
