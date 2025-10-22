export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-6 tracking-tight text-gray-900">Exam Portal</h1>
        <p className="text-gray-600 mb-8 text-lg">Please sign in to continue or create a new account.</p>
        <div className="flex gap-4 justify-center">
          <a href="/login" className="inline-block rounded-xl border border-gray-300 bg-white px-8 py-4 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium text-gray-700 shadow-sm">Sign In</a>
          <a href="/signup" className="inline-block rounded-xl bg-blue-600 text-white px-8 py-4 hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm">Sign Up</a>
        </div>
      </div>
    </main>
  );
}
