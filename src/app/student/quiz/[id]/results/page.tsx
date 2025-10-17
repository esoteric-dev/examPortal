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

  useEffect(() => {
    (async () => {
      try {
        // Get quiz details
        const quizRes = await fetch("/api/quizzes");
        const quizzes: Quiz[] = await quizRes.json();
        const foundQuiz = quizzes.find((q) => q.id === params.id);
        if (!foundQuiz) {
          router.push("/student");
          return;
        }
        setQuiz(foundQuiz);

        // Get latest submission for this quiz
        const submissionRes = await fetch("/api/submissions");
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
      <main className="min-h-screen p-8">
        <p className="text-gray-500">No results found.</p>
        <button
          onClick={() => router.push("/student")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  const answeredQuestions = submission.selectedIndices.filter(idx => idx >= 0).length;
  const totalQuestions = quiz.questions.length;
  const percentage = submission.total ? Math.round((submission.score || 0) / submission.total * 100) : 0;
  
  // Use a stable date format to prevent hydration mismatches
  const submittedAtUtc = new Date(submission.createdAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Quiz Results</h1>
        <h2 className="text-2xl font-semibold mb-2">{quiz.title}</h2>
        {quiz.description && (
          <p className="text-gray-600 mb-6">{quiz.description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Score</h3>
            <p className="text-3xl font-bold text-blue-600">
              {submission.score || 0} / {submission.total || totalQuestions}
            </p>
            <p className="text-sm text-blue-600 mt-1">{percentage}%</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Questions Attempted</h3>
            <p className="text-3xl font-bold text-green-600">
              {answeredQuestions} / {totalQuestions}
            </p>
            <p className="text-sm text-green-600 mt-1">
              {Math.round((answeredQuestions / totalQuestions) * 100)}% completed
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">Submission Time</h3>
            <p className="text-lg font-bold text-purple-600" suppressHydrationWarning>
              {submittedAtUtc}
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Question Review</h3>
          <div className="space-y-4">
            {quiz.questions.map((question, idx) => {
              const selectedIndex = submission.selectedIndices[idx];
              const isCorrect = selectedIndex === question.correctIndex;
              const isAnswered = selectedIndex >= 0;

              return (
                <div key={idx} className={`border rounded-lg p-4 ${
                  isCorrect ? 'border-green-200 bg-green-50' : 
                  isAnswered ? 'border-red-200 bg-red-50' : 
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium">Question {idx + 1}</h4>
                    <span className={`px-2 py-1 rounded text-sm ${
                      isCorrect ? 'bg-green-100 text-green-800' :
                      isAnswered ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {isCorrect ? 'Correct' : isAnswered ? 'Incorrect' : 'Not Answered'}
                    </span>
                  </div>
                  
                  <p className="mb-3">{question.text}</p>
                  
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
