import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers, activityLogs, type NewUser, type NewTeam, type NewTeamMember, ActivityType } from '@/lib/db/schema';
import { hashPassword, setSession } from '@/lib/auth/session';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');

    if (error || !code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/sign-in?error=google_denied`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('[GOOGLE AUTH] Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/sign-in?error=google_failed`);
    }

    const tokens = await tokenRes.json();

    // Get user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      console.error('[GOOGLE AUTH] User info failed:', await userInfoRes.text());
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/sign-in?error=google_failed`);
    }

    const googleUser = await userInfoRes.json();
    const email = googleUser.email as string;
    const name = googleUser.name as string || email.split('@')[0];

    if (!email) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/sign-in?error=google_no_email`);
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      // User exists — just sign them in
      await setSession(existingUser);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/dashboard`);
    }

    // New user — create account + team (same flow as email signup)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await hashPassword(randomPassword);

    const newUser: NewUser = {
      email,
      name,
      passwordHash,
      role: 'owner',
    };

    const [createdUser] = await db.insert(users).values(newUser).returning();

    if (!createdUser) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/sign-in?error=creation_failed`);
    }

    // Create team
    const newTeam: NewTeam = {
      name: `${name}'s Team`,
    };

    const [createdTeam] = await db.insert(teams).values(newTeam).returning();

    if (createdTeam) {
      const newTeamMember: NewTeamMember = {
        userId: createdUser.id,
        teamId: createdTeam.id,
        role: 'owner',
      };

      await db.insert(teamMembers).values(newTeamMember);
    }

    // Set session and redirect
    await setSession(createdUser);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/dashboard`);
  } catch (error: any) {
    console.error('[GOOGLE AUTH] Error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/sign-in?error=google_failed`);
  }
}
