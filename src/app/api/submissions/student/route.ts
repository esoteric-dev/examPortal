import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/security';
import { readSubmissions } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await withAuth(request);
    if (error) return error;

    // Only students can view their own submissions
    if (user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Read from file-based storage and filter by student
    const all = await readSubmissions();
    const userEmail = user.email.toLowerCase();
    const userNameFallback = user.email.split('@')[0];
    const mine = all.filter((s: any) => {
      if (s.studentEmail) return String(s.studentEmail).toLowerCase() === userEmail;
      // Fallback: compare studentName to name/email local-part if email not stored
      if (s.studentName) return String(s.studentName).toLowerCase() === userNameFallback.toLowerCase();
      return false;
    });

    // Sort by creation/submission date (newest first)
    mine.sort((a: any, b: any) => new Date(b.createdAt || b.submittedAt || 0).getTime() - new Date(a.createdAt || a.submittedAt || 0).getTime());

    return NextResponse.json(mine);
  } catch (error) {
    console.error('Error fetching student submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
