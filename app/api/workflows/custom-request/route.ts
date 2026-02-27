import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { customWorkflowRequests } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name, description, useCase } = await request.json();

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required.' },
        { status: 400 }
      );
    }

    const [result] = await db
      .insert(customWorkflowRequests)
      .values({
        userId: user.id,
        name,
        description,
        useCase: useCase || null,
      })
      .returning();

    // Send notification email to admin if configured
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
          subject: `[Fanverse] New Custom Workflow Request: ${name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2>New Custom Workflow Request</h2>
              <p><strong>From:</strong> ${user.email}</p>
              <p><strong>Workflow Name:</strong> ${name}</p>
              <p><strong>Description:</strong></p>
              <p>${description}</p>
              ${useCase ? `<p><strong>Use Case:</strong></p><p>${useCase}</p>` : ''}
              <p><strong>Request ID:</strong> #${result.id}</p>
              <hr />
              <p style="color: #666; font-size: 14px;">You have 5 business days to respond to this request.</p>
            </div>
          `,
        }),
      });
    } else {
      console.log(`[CUSTOM WORKFLOW REQUEST] From: ${user.email}, Name: ${name}, Description: ${description}`);
    }

    return NextResponse.json({ success: true, requestId: result.id });
  } catch (error) {
    console.error('Custom workflow request error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
