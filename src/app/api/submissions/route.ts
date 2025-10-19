import { NextRequest, NextResponse } from "next/server";
import { withAuth, security } from "@/lib/security";
import { readQuizzes } from "@/lib/storage";
import { readSubmissions, writeSubmissions, type Submission } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await withAuth(request);
    if (error) return error;

    // Only teachers and admins can view all submissions
    if (!security.hasRole(user, ['teacher', 'admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For now, return file-based submissions list
    const submissions = await readSubmissions();
    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await withAuth(request);
    if (error) return error;

    // Only students can submit quizzes
    if (user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { quizId, selectedIndices, startedAtIso } = body ?? {};

    if (!quizId || !Array.isArray(selectedIndices)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Get quiz details (use file-based storage on server)
    const quizzes = await readQuizzes();
    const quiz = quizzes.find(q => q.id === String(quizId));
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Validate quiz is active if such a flag exists on persisted data
    if ((quiz as unknown as { isActive?: boolean })?.isActive === false) {
      return NextResponse.json({ error: "Quiz is not active" }, { status: 400 });
    }

    // Clamp selected indices to valid range; treat invalid as -1 (unanswered)
    const normalized = quiz.questions.map((q, i) => {
      const idx = Number(selectedIndices[i]);
      if (Number.isFinite(idx) && idx >= 0 && idx < q.options.length) return idx;
      return -1;
    });

    // Calculate score
    const totalQuestions = quiz.questions.length;
    let correctAnswers = 0;
    normalized.forEach((idx, i) => {
      if (idx === quiz.questions[i].correctIndex) correctAnswers += 1;
    });

    // Calculate time spent
    const startedAt = new Date(startedAtIso);
    const submittedAt = new Date();
    const timeSpent = Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000);

    // Optional time enforcement on server (best-effort)
    let finalScore = correctAnswers;
    if (quiz.timeLimitSeconds && typeof startedAtIso === "string") {
      const startedAtMs = Date.parse(startedAtIso);
      const now = Date.now();
      if (Number.isFinite(startedAtMs) && now - startedAtMs > quiz.timeLimitSeconds * 1000) {
        // Late submission: accept but do not award score (policy can vary)
        finalScore = 0;
      }
    }

    // Store minimal submission shape compatible with current readers
    const submission: Submission = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      quizId: String(quizId),
      selectedIndices: normalized,
      score: finalScore,
      total: totalQuestions,
      createdAt: submittedAt.toISOString(),
      // keep optional for legacy UIs
      studentName: user.name,
    };

    const existing: Submission[] = await readSubmissions();
    existing.push(submission);
    await writeSubmissions(existing);

    // Log security event
    await security.logSecurityEvent('quiz_submission', user.id, {
      quizId,
      score: finalScore,
      totalQuestions,
      timeSpent,
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


