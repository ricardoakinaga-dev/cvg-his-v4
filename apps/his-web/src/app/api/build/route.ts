import { NextResponse } from 'next/server';

import { getBuildInfo } from '@/lib/buildStamp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const build = getBuildInfo();

  return NextResponse.json(
    {
      service: 'his-web',
      ...build
    },
    { status: 200 }
  );
}
