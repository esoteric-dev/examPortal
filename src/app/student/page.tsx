"use client";

import { useEffect, useState } from "react";
import { User, Quiz, QuizSubmission } from "@/lib/database";

export default function StudentHome() {
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'results' | 'profile'>('quizzes');

  useEffect(() => {
    (async () => {
      try {
        // Load user profile
        const userRes = await fetch("/api/user/profile");
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }

        // Load available quizzes
        const quizzesRes = await fetch("/api/quizzes");
        if (quizzesRes.ok) {
          const quizzesData = await quizzesRes.json();
          setQuizzes(Array.isArray(quizzesData) ? quizzesData : []);
        }

        // Load past submissions
        const submissionsRes = await fetch("/api/submissions/student");
        if (submissionsRes.ok) {
          const submissionsData = await submissionsRes.json();
          setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 text-lg">Welcome back, {user?.name || 'Student'}!</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'quizzes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Available Quizzes
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Past Results
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'quizzes' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Available Quizzes</h2>
            {quizzes.length === 0 ? (
              <div className="rounded-xl border border-gray-200 p-8 bg-white shadow-sm">
                <p className="text-gray-500 text-center">No quizzes available yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="font-semibold text-lg text-gray-900 mb-2">{quiz.title}</div>
                    {quiz.description && (
                      <div className="text-sm text-gray-600 mb-4">{quiz.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mb-4">
                      {quiz.questions.length} questions
                      {quiz.timeLimitSeconds && ` • ${Math.floor(quiz.timeLimitSeconds / 60)} min limit`}
                    </div>
                    <a 
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm" 
                      href={`/student/quiz/${quiz.id}`}
                    >
                      Take quiz →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Past Results</h2>
            {submissions.length === 0 ? (
              <div className="rounded-xl border border-gray-200 p-8 bg-white shadow-sm">
                <p className="text-gray-500 text-center">No quiz results yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div key={submission.id} className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{submission.studentName}</h3>
                        <p className="text-sm text-gray-600">Quiz ID: {submission.quizId}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(submission.correctAnswers, submission.totalQuestions)}`}>
                        {submission.correctAnswers}/{submission.totalQuestions} ({Math.round((submission.correctAnswers / submission.totalQuestions) * 100)}%)
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Score:</span> {submission.score}
                      </div>
                      <div>
                        <span className="font-medium">Time Spent:</span> {Math.floor(submission.timeSpent / 60)}m {submission.timeSpent % 60}s
                      </div>
                      <div>
                        <span className="font-medium">Started:</span> {formatDate(submission.startedAt)}
                      </div>
                      <div>
                        <span className="font-medium">Submitted:</span> {formatDate(submission.submittedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Profile</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <p className="text-lg text-gray-900">{user?.name || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <p className="text-lg text-gray-900">{user?.email || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <p className="text-lg text-gray-900 capitalize">{user?.role || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                  <p className="text-lg text-gray-900">{user?.createdAt ? formatDate(user.createdAt) : 'Not set'}</p>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{submissions.length}</div>
                    <div className="text-sm text-gray-600">Quizzes Taken</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {submissions.length > 0 
                        ? Math.round(submissions.reduce((acc, s) => acc + (s.correctAnswers / s.totalQuestions), 0) / submissions.length * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-600">Average Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {submissions.length > 0 
                        ? Math.round(submissions.reduce((acc, s) => acc + s.timeSpent, 0) / submissions.length / 60)
                        : 0}m
                    </div>
                    <div className="text-sm text-gray-600">Avg. Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


