import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { sql } from 'drizzle-orm';

// Simple rate limit: max 2 contact messages per user per week
// We'll use a lightweight approach with a dedicated table or just check recent submissions

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to send a message.' }, { status: 401 });
    }

    const body = await request.json();
    const { email, subject, message } = body;

    if (!email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Email and message are required.' }, { status: 400 });
    }

    if (message.trim().length > 2000) {
      return NextResponse.json({ error: 'Message is too long (max 2000 characters).' }, { status: 400 });
    }

    // Check rate limit: 2 per week per user
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM contact_messages WHERE user_id = ${user.id} AND created_at > ${oneWeekAgo}`
    );

    const count = Number((recentCount as any)[0]?.count ?? 0);
    if (count >= 2) {
      return NextResponse.json({
        error: 'You can only send 2 messages per week. Please try again later or join our Discord.',
      }, { status: 429 });
    }

    // Insert contact message
    await db.execute(
      sql`INSERT INTO contact_messages (user_id, email, subject, message, created_at) VALUES (${user.id}, ${email.trim()}, ${subject?.trim() || null}, ${message.trim()}, NOW())`
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Contact error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
