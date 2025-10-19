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
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-600 mb-8 text-lg">Create new quizzes and manage them.</p>

      <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 p-8 mb-8 space-y-6 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">You can also prepare questions offline.</div>
          <a
            href="/api/quizzes/template"
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            download
          >
            Download JSON template
          </a>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Upload JSON</label>
          <input
            type="file"
            accept="application/json"
            className="text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportJson(f);
            }}
          />
          {importing && <span className="text-sm text-gray-600">Importing...</span>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Title</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Algebra Basics"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Description (optional)</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Time limit (seconds, optional)</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            type="number"
            min={10}
            value={timeLimitSeconds}
            onChange={(e) => setTimeLimitSeconds(e.target.value)}
            placeholder="e.g., 600 for 10 minutes"
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-lg font-medium text-gray-900">Questions</label>
            <button
              type="button"
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => setQuestions((qs) => [...qs, { text: "", options: ["", "", "", ""], correctIndex: 0 }])}
            >
              Add Question
            </button>
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="rounded-lg border border-gray-200 p-6 space-y-4 bg-gray-50">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Question {qi + 1}</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                  <div key={oi} className="flex items-center gap-3">
                    <input
                      className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
                    className="text-sm px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors"
                    onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}
                  >
                    Remove Question
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}
        <button
          type="submit"
          className="rounded-lg bg-blue-600 text-white px-6 py-3 disabled:opacity-60 hover:bg-blue-700 transition-colors font-medium"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Quiz"}
        </button>
      </form>

      <section className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900">Your Quizzes</h2>
        {quizzes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No quizzes yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((q) => (
              <div key={q.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold text-lg text-gray-900 mb-2">{q.title}</div>
                {q.description && (
                  <div className="text-sm text-gray-600 mb-3">{q.description}</div>
                )}
                <div className="text-xs text-gray-500">
                  {q.questions.length} question{q.questions.length === 1 ? "" : "s"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
    </main>
  );
}


