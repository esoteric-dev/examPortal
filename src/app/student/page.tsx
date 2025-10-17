"use client";

import { useEffect, useState } from "react";

type Quiz = {
  id: string;
  title: string;
  description?: string;
  questions: string[];
  createdAt: string;
};

export default function StudentHome() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/quizzes");
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">Student Dashboard</h1>
      <p className="text-gray-600 mb-6">Browse quizzes and start attempts.</p>

      {loading ? (
        <p className="text-gray-500">Loading quizzes...</p>
      ) : quizzes.length === 0 ? (
        <div className="rounded-xl border p-6">
          <p className="text-gray-500">No quizzes available yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {quizzes.map((q) => (
            <li key={q.id} className="border rounded p-4">
              <div className="font-medium">{q.title}</div>
              {q.description && (
                <div className="text-sm text-gray-600">{q.description}</div>
              )}
              <a className="text-sm text-blue-600 underline mt-2 inline-block" href={`/student/quiz/${q.id}`}>
                Take quiz →
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}


