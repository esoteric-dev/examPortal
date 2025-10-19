"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// Client-only wrapper to prevent hydration mismatches
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading results...</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}


type MCQQuestion = { text: string; options: string[]; correctIndex: number };
type Quiz = {
  id: string;
  title: string;
  description?: string;
  timeLimitSeconds?: number;
  questions: MCQQuestion[];
  createdAt: string;
};

type Submission = {
  id: string;
  quizId: string;
  studentName?: string;
  selectedIndices: number[];
  score?: number;
  total?: number;
  createdAt: string;
};

function QuizResultsPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'incorrect' | 'unanswered'>('all');

  useEffect(() => {
    (async () => {
      try {
        // Get quiz details
        const quizRes = await fetch("/api/quizzes", { cache: 'no-store' });
        if (!quizRes.ok) throw new Error('Failed to fetch quizzes');
        const quizzes: Quiz[] = await quizRes.json();
        const foundQuiz = quizzes.find((q) => q.id === params.id);
        if (!foundQuiz) {
          router.push("/student");
          return;
        }
        setQuiz(foundQuiz);

        // Get latest submission for this quiz (current student only)
        const submissionRes = await fetch("/api/submissions/student", { cache: 'no-store' });
        if (submissionRes.status === 401) {
          router.replace('/login');
          return;
        }
        if (submissionRes.status === 403) {
          router.replace('/student');
          return;
        }
        if (!submissionRes.ok) throw new Error('Failed to fetch submissions');
        const submissions: Submission[] = await submissionRes.json();
        const latestSubmission = submissions
          .filter((s) => s.quizId === params.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        
        if (latestSubmission) {
          setSubmission(latestSubmission);
        }
      } catch (err) {
        console.error("Failed to load results:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, router]);

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-gray-500">Loading results...</p>
      </main>
    );
  }

  if (!quiz || !submission) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-yellow-200 rounded-lg p-6 shadow-sm">
            <p className="text-yellow-800">No results found for this quiz.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => router.push("/student")}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push(`/student/quiz/${params.id}`)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Start Quiz
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const percentage = submission?.total && submission?.score != null
    ? Math.round(((submission.score as number) / (submission.total as number)) * 100)
    : 0;
  
  // Use a stable date format to prevent hydration mismatches
  const submittedAtUtc = new Date(submission.createdAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const selectedArray = Array.isArray(submission?.selectedIndices)
    ? (submission.selectedIndices as number[])
    : [];
  const totalQuestions = quiz.questions.length;
  const answeredQuestions = selectedArray.reduce((count, idx) => count + (idx >= 0 ? 1 : 0), 0);
  const incorrectIndices = selectedArray
    .map((idx, i) => ({ i, incorrect: idx >= 0 && idx !== quiz.questions[i].correctIndex }))
    .filter(x => x.incorrect)
    .map(x => x.i);

  const unansweredIndices = selectedArray
    .map((idx, i) => ({ i, unanswered: idx < 0 }))
    .filter(x => x.unanswered)
    .map(x => x.i);

  const indicesToRender = quiz.questions
    .map((_, i) => i)
    .filter(i => {
      if (viewFilter === 'all') return true;
      if (viewFilter === 'incorrect') return incorrectIndices.includes(i);
      if (viewFilter === 'unanswered') return unansweredIndices.includes(i);
      return true;
    });

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-gray-900">Quiz Results</h1>
            <h2 className="text-xl font-semibold text-gray-800">{quiz.title}</h2>
            {quiz.description && (
              <p className="text-gray-600 mt-1">{quiz.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/student")}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push(`/student/quiz/${quiz.id}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retake Quiz
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Score</h3>
            <p className="text-3xl font-bold text-blue-600">
              {submission.score || 0} / {submission.total || totalQuestions}
            </p>
            <p className="text-sm text-blue-600 mt-1">{percentage}%</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Questions Attempted</h3>
            <p className="text-3xl font-bold text-green-600">
              {answeredQuestions} / {totalQuestions}
            </p>
            <p className="text-sm text-green-600 mt-1">
              {Math.round((answeredQuestions / totalQuestions) * 100)}% completed
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">Submission Time</h3>
            <p className="text-lg font-bold text-purple-600" suppressHydrationWarning>
              {submittedAtUtc}
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="text-xl font-semibold">Question Review</h3>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <button
                  onClick={() => setViewFilter('all')}
                  className={`px-3 py-1 text-sm ${viewFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  title="Show all questions"
                >All</button>
                <button
                  onClick={() => setViewFilter('incorrect')}
                  className={`px-3 py-1 text-sm border-l border-gray-200 ${viewFilter === 'incorrect' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-red-50'}`}
                  title="Show incorrect"
                >Incorrect</button>
                <button
                  onClick={() => setViewFilter('unanswered')}
                  className={`px-3 py-1 text-sm border-l border-gray-200 ${viewFilter === 'unanswered' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700 hover:bg-yellow-50'}`}
                  title="Show unanswered"
                >Unanswered</button>
              </div>
              <button
                onClick={() => setExpandAll(v => !v)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {expandAll ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {indicesToRender.length === 0 && (
              <div className="text-sm text-gray-500">No questions match the selected filter.</div>
            )}
            {indicesToRender.map((idx) => {
              const question = quiz.questions[idx];
              const selectedIndex = Array.isArray(submission?.selectedIndices)
                ? submission.selectedIndices[idx] ?? -1
                : -1;
              const isCorrect = selectedIndex === question.correctIndex;
              const isAnswered = selectedIndex >= 0;

              return (
                <details key={idx} className={`rounded-lg border ${
                  isCorrect ? 'border-green-200 bg-green-50' : 
                  isAnswered ? 'border-red-200 bg-red-50' : 
                  'border-gray-200 bg-gray-50'
                }`} open={expandAll}>
                  <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-white border text-sm font-medium text-gray-700">{idx + 1}</span>
                      <span className="font-medium text-gray-900">{question.text}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      isCorrect ? 'bg-green-100 text-green-800' :
                      isAnswered ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {isCorrect ? 'Correct' : isAnswered ? 'Incorrect' : 'Not Answered'}
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    <div className="space-y-2">
                      {question.options.map((option, optIdx) => {
                        const isSelected = selectedIndex === optIdx;
                        const isCorrectAnswer = optIdx === question.correctIndex;
                        return (
                          <div key={optIdx} className={`p-2 rounded ${
                            isCorrectAnswer ? 'bg-green-100 border border-green-300' :
                            isSelected ? 'bg-red-100 border border-red-300' :
                            'bg-gray-100'
                          }`}>
                            <span className={`font-medium ${
                              isCorrectAnswer ? 'text-green-800' :
                              isSelected ? 'text-red-800' :
                              'text-gray-600'
                            }`}>
                              {isCorrectAnswer ? '✓ ' : isSelected ? '✗ ' : '○ '}
                              {option}
                              {isCorrectAnswer && ' (Correct Answer)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push("/student")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => router.push(`/student/quiz/${quiz.id}`)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    </main>
  );
}

export default function QuizResultsPage() {
  return (
    <ClientOnly>
      <QuizResultsPageContent />
    </ClientOnly>
  );
}
