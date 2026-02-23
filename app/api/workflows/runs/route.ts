import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWorkflowRuns } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') || '20');
  const runs = await getUserWorkflowRuns(user.id, Math.min(limit, 100));

  return NextResponse.json(runs);
}
