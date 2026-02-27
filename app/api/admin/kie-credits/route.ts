import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { getKieCredits } from '@/lib/kie/credits';

export async function GET() {
  const user = await getUser();
  if (!user || user.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const credits = await getKieCredits();

  return NextResponse.json({
    provider: 'kie.ai',
    credits,
    status: credits === null ? 'unknown' : credits <= 0 ? 'depleted' : credits < 500 ? 'low' : 'ok',
  });
}
