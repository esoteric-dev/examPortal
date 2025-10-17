import { NextResponse } from "next/server";
import { readSubmissions, writeSubmissions, readQuizzes, type Submission } from "@/lib/storage";

export async function GET() {
  const submissions = await readSubmissions();
  return NextResponse.json(submissions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { quizId, selectedIndices, studentName, startedAtIso } = body ?? {};

  if (!quizId || !Array.isArray(selectedIndices)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const quizzes = await readQuizzes();
  const quiz = quizzes.find((q) => q.id === String(quizId));
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Clamp selected indices to valid range; treat invalid as -1 (unanswered)
  const normalized = quiz.questions.map((q, i) => {
    const idx = Number(selectedIndices[i]);
    if (Number.isFinite(idx) && idx >= 0 && idx < q.options.length) return idx;
    return -1;
  });

  // Scoring
  const total = quiz.questions.length;
  let score = 0;
  normalized.forEach((idx, i) => {
    if (idx === quiz.questions[i].correctIndex) score += 1;
  });

  // Optional time enforcement on server (best-effort)
  if (quiz.timeLimitSeconds && typeof startedAtIso === "string") {
    const startedAt = Date.parse(startedAtIso);
    const now = Date.now();
    if (Number.isFinite(startedAt) && now - startedAt > quiz.timeLimitSeconds * 1000) {
      // Late submission: accept but do not award score (policy can vary)
      score = 0;
    }
  }

  const newSubmission: Submission = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    quizId: String(quizId),
    studentName: studentName ? String(studentName) : undefined,
    selectedIndices: normalized,
    score,
    total,
    createdAt: new Date().toISOString(),
  };

  const existing = await readSubmissions();
  existing.push(newSubmission);
  await writeSubmissions(existing);
  return NextResponse.json(newSubmission, { status: 201 });
}


