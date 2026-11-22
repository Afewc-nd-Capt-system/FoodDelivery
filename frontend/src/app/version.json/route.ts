import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const commit =
    process.env.NEXT_PUBLIC_BUILD_COMMIT
    || process.env.VERCEL_GIT_COMMIT_SHA
    || 'dev';
  return NextResponse.json({ commit, generatedAt: new Date().toISOString() });
}
