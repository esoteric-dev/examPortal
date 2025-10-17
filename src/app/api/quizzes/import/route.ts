import { NextResponse } from "next/server";
import { readQuizzes, writeQuizzes, type Quiz, type MCQQuestion } from "@/lib/storage";

type IncomingQuiz = {
  title: string;
  description?: string;
  timeLimitSeconds?: number;
  questions: Array<{ text: string; options: string[]; correctIndex: number }>;
};

function validateQuiz(payload: unknown): { ok: true; quiz: Omit<Quiz, "id" | "createdAt"> } | { ok: false; error: string } {
  if (!payload || typeof payload !== "object" || payload === null) {
    return { ok: false, error: "Invalid quiz payload" };
  }
  const p = payload as Record<string, unknown>;
  if (typeof p.title !== "string" || !Array.isArray(p.questions) || p.questions.length === 0) {
    return { ok: false, error: "Invalid quiz payload" };
  }
  const mcqs: MCQQuestion[] = [];
  for (const q of p.questions as unknown[]) {
    if (!q || typeof q !== "object" || q === null) {
      return { ok: false, error: "Invalid question format" };
    }
    const question = q as Record<string, unknown>;
    if (typeof question.text !== "string" || !Array.isArray(question.options) || typeof question.correctIndex !== "number") {
      return { ok: false, error: "Invalid question format" };
    }
    const options = question.options.map((o: unknown) => String(o)).filter((o: string) => o.length > 0);
    if (options.length < 2) return { ok: false, error: "Each question requires at least 2 options" };
    if (question.correctIndex < 0 || question.correctIndex >= options.length) return { ok: false, error: "correctIndex out of range" };
    mcqs.push({ text: question.text, options, correctIndex: question.correctIndex });
  }
  return {
    ok: true,
    quiz: {
      title: String(p.title),
      description: p.description ? String(p.description) : undefined,
      timeLimitSeconds: typeof p.timeLimitSeconds === "number" ? p.timeLimitSeconds : undefined,
      questions: mcqs,
    },
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const incoming: IncomingQuiz[] = Array.isArray(body) ? body : [body];
  const validated: Array<Omit<Quiz, "id" | "createdAt">> = [];

  for (const item of incoming) {
    const res = validateQuiz(item);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    validated.push(res.quiz);
  }

  const existing = await readQuizzes();
  const imported: Quiz[] = validated.map((q) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...q,
  }));

  await writeQuizzes([...existing, ...imported]);
  return NextResponse.json({ importedCount: imported.length, quizzes: imported }, { status: 201 });
}


