import path from "path";
import fs from "fs/promises";

export type MCQQuestion = {
  text: string;
  options: string[]; // at least 2
  correctIndex: number; // 0-based index into options
};

export type Quiz = {
  id: string;
  title: string;
  description?: string;
  timeLimitSeconds?: number; // optional timer for entire quiz
  questions: MCQQuestion[];
  createdAt: string;
};

export type Submission = {
  id: string;
  quizId: string;
  studentName?: string;
  selectedIndices: number[]; // per-question selected option index
  score?: number; // auto-computed on submission
  total?: number; // total questions
  createdAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const quizzesFile = path.join(dataDir, "quizzes.json");
const submissionsFile = path.join(dataDir, "submissions.json");

async function ensureDataFiles(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(quizzesFile);
  } catch {
    await fs.writeFile(quizzesFile, JSON.stringify([]));
  }
  try {
    await fs.access(submissionsFile);
  } catch {
    await fs.writeFile(submissionsFile, JSON.stringify([]));
  }
}

export async function readQuizzes(): Promise<Quiz[]> {
  await ensureDataFiles();
  const raw = await fs.readFile(quizzesFile, "utf-8");
  const parsed = JSON.parse(raw) as any[];
  // Best-effort normalization in case of older shape
  return parsed.map((q) => {
    if (Array.isArray(q?.questions) && typeof q.questions[0] === "string") {
      return {
        ...q,
        questions: (q.questions as string[]).map((text: string) => ({
          text,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctIndex: 0,
        })),
      } as Quiz;
    }
    return q as Quiz;
  });
}

export async function writeQuizzes(quizzes: Quiz[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(quizzesFile, JSON.stringify(quizzes, null, 2));
}

export async function readSubmissions(): Promise<Submission[]> {
  await ensureDataFiles();
  const raw = await fs.readFile(submissionsFile, "utf-8");
  return JSON.parse(raw) as Submission[];
}

export async function writeSubmissions(submissions: Submission[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(submissionsFile, JSON.stringify(submissions, null, 2));
}


