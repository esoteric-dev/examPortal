"use client";

import { useEffect, useState } from "react";

type MCQQuestion = { text: string; options: string[]; correctIndex: number };
type Quiz = {
  id: string;
  title: string;
  description?: string;
  timeLimitSeconds?: number;
  questions: MCQQuestion[];
  createdAt: string;
};

export default function TeacherHome() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<string>("");
  const [questions, setQuestions] = useState<MCQQuestion[]>([
    { text: "", options: ["", "", "", ""], correctIndex: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function fetchQuizzes() {
    const res = await fetch("/api/quizzes");
    const data = await res.json();
    setQuizzes(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchQuizzes();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleaned = questions
      .map((q) => ({
        text: q.text.trim(),
        options: q.options.map((o) => o.trim()).filter(Boolean),
        correctIndex: q.correctIndex,
      }))
      .filter((q) => q.text && q.options.length >= 2);
    if (!title || cleaned.length === 0) {
      setError("Please provide a title and at least one valid MCQ.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          timeLimitSeconds: timeLimitSeconds ? Number(timeLimitSeconds) : undefined,
          questions: cleaned,
        }),
      });
      if (!res.ok) throw new Error("Failed to create quiz");
      setTitle("");
      setDescription("");
      setTimeLimitSeconds("");
      setQuestions([{ text: "", options: ["", "", "", ""], correctIndex: 0 }]);
      await fetchQuizzes();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImportJson(file: File) {
    setError(null);
    setImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch("/api/quizzes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as Record<string, unknown>));
        throw new Error(data?.error || "Import failed");
      }
      await fetchQuizzes();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-2">Teacher Dashboard</h1>
      <p className="text-gray-600 mb-6">Create new quizzes and manage them.</p>

      <form onSubmit={handleCreate} className="rounded-xl border p-6 mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">You can also prepare questions offline.</div>
          <a
            href="/api/quizzes/template"
            className="text-sm px-3 py-1 border rounded"
            download
          >
            Download JSON template
          </a>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Upload JSON</label>
          <input
            type="file"
            accept="application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportJson(f);
            }}
          />
          {importing && <span className="text-sm text-gray-600">Importing...</span>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Algebra Basics"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description (optional)</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time limit (seconds, optional)</label>
          <input
            className="w-full border rounded px-3 py-2"
            type="number"
            min={10}
            value={timeLimitSeconds}
            onChange={(e) => setTimeLimitSeconds(e.target.value)}
            placeholder="e.g., 600 for 10 minutes"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Questions</label>
            <button
              type="button"
              className="text-sm px-3 py-1 border rounded"
              onClick={() => setQuestions((qs) => [...qs, { text: "", options: ["", "", "", ""], correctIndex: 0 }])}
            >
              Add Question
            </button>
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="rounded border p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Question {qi + 1}</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={q.text}
                  onChange={(e) => {
                    const copy = [...questions];
                    copy[qi].text = e.target.value;
                    setQuestions(copy);
                  }}
                  placeholder="Enter question text"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      className="border rounded px-3 py-2 w-full"
                      value={opt}
                      onChange={(e) => {
                        const copy = [...questions];
                        copy[qi].options[oi] = e.target.value;
                        setQuestions(copy);
                      }}
                      placeholder={`Option ${oi + 1}`}
                    />
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={q.correctIndex === oi}
                      onChange={() => {
                        const copy = [...questions];
                        copy[qi].correctIndex = oi;
                        setQuestions(copy);
                      }}
                      title="Mark correct"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-sm px-3 py-1 border rounded"
                  onClick={() => {
                    const copy = [...questions];
                    copy[qi].options.push("");
                    setQuestions(copy);
                  }}
                >
                  Add Option
                </button>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="text-sm px-3 py-1 border rounded text-red-700"
                    onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}
                  >
                    Remove Question
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Quiz"}
        </button>
      </form>

      <section>
        <h2 className="text-2xl font-semibold mb-3">Your Quizzes</h2>
        {quizzes.length === 0 ? (
          <p className="text-gray-500">No quizzes yet.</p>
        ) : (
          <ul className="space-y-2">
            {quizzes.map((q) => (
              <li key={q.id} className="border rounded p-4">
                <div className="font-medium">{q.title}</div>
                {q.description && (
                  <div className="text-sm text-gray-600">{q.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {q.questions.length} question{q.questions.length === 1 ? "" : "s"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}


