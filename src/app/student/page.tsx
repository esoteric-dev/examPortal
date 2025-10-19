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
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600 mb-8 text-lg">Browse quizzes and start attempts.</p>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading quizzes...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="rounded-xl border border-gray-200 p-8 bg-white shadow-sm">
            <p className="text-gray-500 text-center">No quizzes available yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((q) => (
              <div key={q.id} className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="font-semibold text-lg text-gray-900 mb-2">{q.title}</div>
                {q.description && (
                  <div className="text-sm text-gray-600 mb-4">{q.description}</div>
                )}
                <a 
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm" 
                  href={`/student/quiz/${q.id}`}
                >
                  Take quiz →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}


