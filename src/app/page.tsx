export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Exam Portal</h1>
        <p className="text-gray-600 mb-8">Select your role to continue.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/student" className="rounded-xl border p-6 hover:bg-gray-50 transition">
            <h2 className="text-xl font-semibold mb-2">Student</h2>
            <p className="text-gray-500">Access available quizzes and submit answers.</p>
          </a>
          <a href="/teacher" className="rounded-xl border p-6 hover:bg-gray-50 transition">
            <h2 className="text-xl font-semibold mb-2">Teacher</h2>
            <p className="text-gray-500">Create quizzes and review submissions.</p>
          </a>
        </div>
      </div>
    </main>
  );
}
