import { NextResponse } from 'next/server';
import { getWorkflows } from '@/lib/db/queries';

export async function GET() {
  const workflows = await getWorkflows();
  return NextResponse.json(workflows);
}
