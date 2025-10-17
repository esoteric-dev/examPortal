import { NextResponse } from "next/server";
import { readQuizzes, writeQuizzes, type Quiz, type MCQQuestion } from "@/lib/storage";

type IncomingQuiz = {
  title: string;
  description?: string;
  timeLimitSeconds?: number;
  questions: Array<{ text: string; options: string[]; correctIndex: number }>;
};

function validateQuiz(payload: any): { ok: true; quiz: Omit<Quiz, "id" | "createdAt"> } | { ok: false; error: string } {
  if (!payload || typeof payload.title !== "string" || !Array.isArray(payload.questions) || payload.questions.length === 0) {
    return { ok: false, error: "Invalid quiz payload" };
  }
  const mcqs: MCQQuestion[] = [];
  for (const q of payload.questions) {
    if (!q || typeof q.text !== "string" || !Array.isArray(q.options) || typeof q.correctIndex !== "number") {
      return { ok: false, error: "Invalid question format" };
    }
    const options = q.options.map((o: any) => String(o)).filter((o: string) => o.length > 0);
    if (options.length < 2) return { ok: false, error: "Each question requires at least 2 options" };
    if (q.correctIndex < 0 || q.correctIndex >= options.length) return { ok: false, error: "correctIndex out of range" };
    mcqs.push({ text: q.text, options, correctIndex: q.correctIndex });
  }
  return {
    ok: true,
    quiz: {
      title: String(payload.title),
      description: payload.description ? String(payload.description) : undefined,
      timeLimitSeconds: typeof payload.timeLimitSeconds === "number" ? payload.timeLimitSeconds : undefined,
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


