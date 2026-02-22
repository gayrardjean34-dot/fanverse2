import { NextResponse } from 'next/server';
import { getActiveWorkflows } from '@/lib/db/queries';

export async function GET() {
  const wfs = await getActiveWorkflows();
  return NextResponse.json(wfs);
}
