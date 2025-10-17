import { NextResponse } from "next/server";
import { readQuizzes, writeQuizzes, type Quiz, type MCQQuestion } from "@/lib/storage";

export async function GET() {
  const quizzes = await readQuizzes();
  return NextResponse.json(quizzes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, timeLimitSeconds, questions } = body ?? {};

  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Validate MCQ questions
  const mcqs: MCQQuestion[] = [];
  for (const q of questions as unknown[]) {
    if (!q || typeof q !== "object" || q === null) {
      return NextResponse.json({ error: "Invalid question format" }, { status: 400 });
    }
    const question = q as Record<string, unknown>;
    if (typeof question.text !== "string" || !Array.isArray(question.options) || typeof question.correctIndex !== "number") {
      return NextResponse.json({ error: "Invalid question format" }, { status: 400 });
    }
    const options = question.options.map((o: unknown) => String(o)).filter((o: string) => o.length > 0);
    if (options.length < 2) {
      return NextResponse.json({ error: "Each question needs at least 2 options" }, { status: 400 });
    }
    if (question.correctIndex < 0 || question.correctIndex >= options.length) {
      return NextResponse.json({ error: "correctIndex out of range" }, { status: 400 });
    }
    mcqs.push({ text: question.text, options, correctIndex: question.correctIndex });
  }

  const newQuiz: Quiz = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: String(title),
    description: description ? String(description) : undefined,
    timeLimitSeconds: typeof timeLimitSeconds === "number" ? timeLimitSeconds : undefined,
    questions: mcqs,
    createdAt: new Date().toISOString(),
  };

  const existing = await readQuizzes();
  existing.push(newQuiz);
  await writeQuizzes(existing);
  return NextResponse.json(newQuiz, { status: 201 });
}


