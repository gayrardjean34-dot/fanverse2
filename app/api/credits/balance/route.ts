import { NextResponse } from 'next/server';
import { getUser, getUserCreditBalance, getUserCreditHistory } from '@/lib/db/queries';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [balance, transactions] = await Promise.all([
    getUserCreditBalance(user.id),
    getUserCreditHistory(user.id, 20),
  ]);

  return NextResponse.json({ balance, transactions });
}
