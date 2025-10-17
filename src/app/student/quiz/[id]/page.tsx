"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type MCQQuestion = { text: string; options: string[]; correctIndex: number };
type Quiz = {
  id: string;
  title: string;
  description?: string;
  timeLimitSeconds?: number;
  questions: MCQQuestion[];
  createdAt: string;
};

export default function TakeQuizPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [studentName, setStudentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAtIso, setStartedAtIso] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visited, setVisited] = useState<boolean[]>([]);
  const [marked, setMarked] = useState<boolean[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/quizzes");
      const data: Quiz[] = await res.json();
      const found = data.find((q) => q.id === params.id);
      if (found) {
        setQuiz(found);
        setSelected(new Array(found.questions.length).fill(-1));
        setVisited(new Array(found.questions.length).fill(false));
        setMarked(new Array(found.questions.length).fill(false));
        const nowIso = new Date().toISOString();
        setStartedAtIso(nowIso);
        if (found.timeLimitSeconds) setRemaining(found.timeLimitSeconds);
      }
    })();
  }, [params.id]);

  // countdown
  useEffect(() => {
    if (remaining == null) return;
    if (remaining <= 0) {
      // auto submit
      (async () => {
        if (!submitting) {
          const mockFormEvent = {
            preventDefault: () => {},
            target: null,
            currentTarget: null,
          } as unknown as React.FormEvent;
          await handleSubmit(mockFormEvent);
        }
      })();
      return;
    }
    const id = window.setTimeout(() => setRemaining((r) => (r == null ? r : r - 1)), 1000);
    tickRef.current = id;
    return () => {
      if (tickRef.current) window.clearTimeout(tickRef.current);
    };
  }, [remaining, submitting, handleSubmit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quiz) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id, selectedIndices: selected, studentName, startedAtIso }),
      });
      if (!res.ok) throw new Error("Failed to submit answers");
      router.push("/student");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function formatHMS(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  function goTo(index: number) {
    if (!quiz) return;
    const clamped = Math.max(0, Math.min(index, quiz.questions.length - 1));
    setCurrentIndex(clamped);
    setVisited((v) => {
      const copy = [...v];
      copy[clamped] = true;
      return copy;
    });
  }

  const answered = useMemo(() => selected.map((v) => v >= 0), [selected]);

  if (!quiz) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-gray-500">Loading quiz...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-gray-600 mb-2">{quiz.description}</p>
            )}
            {quiz.timeLimitSeconds != null && (
              <div className="rounded border p-3 bg-gray-50 inline-block">
                <span className="text-sm text-gray-700">Time remaining: {formatHMS(remaining ?? quiz.timeLimitSeconds)}</span>
              </div>
            )}
          </div>
          <div className="w-[280px] shrink-0 border rounded p-3">
            <div className="text-sm font-medium mb-2">Question Palette</div>
            <div className="grid grid-cols-7 gap-2 mb-3">
              {quiz.questions.map((_, i) => {
                const isVisited = visited[i];
                const isMarked = marked[i];
                const isAnswered = answered[i];
                const both = isMarked && isAnswered;
                const color = both
                  ? "bg-purple-600 text-white"
                  : isMarked
                  ? "bg-yellow-500 text-black"
                  : isAnswered
                  ? "bg-green-600 text-white"
                  : isVisited
                  ? "bg-gray-300 text-black"
                  : "bg-white text-black border";
                return (
                  <button
                    key={i}
                    type="button"
                    className={`h-8 w-8 rounded text-xs ${color}`}
                    onClick={() => goTo(i)}
                    title={`Go to question ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-white border" /> Unvisited</div>
              <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-gray-300" /> Visited</div>
              <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-green-600" /> Answered</div>
              <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-yellow-500" /> Marked</div>
              <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-purple-600" /> Answered + Marked</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="rounded border p-4 space-y-2">
              <div className="font-medium">Q{currentIndex + 1}. {quiz.questions[currentIndex].text}</div>
              <div className="space-y-2">
                {quiz.questions[currentIndex].options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q-${currentIndex}`}
                      checked={selected[currentIndex] === oi}
                      onChange={() => {
                        const copy = [...selected];
                        copy[currentIndex] = oi;
                        setSelected(copy);
                        setVisited((v) => {
                          const vv = [...v];
                          vv[currentIndex] = true;
                          return vv;
                        });
                      }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-2 border rounded"
                  onClick={() => goTo(currentIndex - 1)}
                  disabled={currentIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border rounded"
                  onClick={() => goTo(currentIndex + 1)}
                  disabled={quiz.questions.length - 1 === currentIndex}
                >
                  Next
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`px-3 py-2 border rounded ${marked[currentIndex] ? "bg-yellow-100" : ""}`}
                  onClick={() => setMarked((m) => {
                    const copy = [...m];
                    copy[currentIndex] = !copy[currentIndex];
                    return copy;
                  })}
                >
                  {marked[currentIndex] ? "Unmark" : "Mark for review"}
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border rounded"
                  onClick={() => setSelected((s) => {
                    const copy = [...s];
                    copy[currentIndex] = -1;
                    return copy;
                  })}
                >
                  Clear response
                </button>
                <button
                  type="submit"
                  className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>

          <div className="w-[280px] shrink-0" />
        </form>

        <div className="max-w-md">
          <label className="block text-sm font-medium mb-1">Your name (optional)</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="e.g., Alex"
          />
        </div>
      </div>
    </main>
  );
}


