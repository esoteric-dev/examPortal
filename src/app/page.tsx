export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Exam Portal</h1>
        <p className="text-gray-600 mb-8">Please sign in to continue.</p>
        <a href="/login" className="inline-block rounded-xl border px-6 py-3 hover:bg-gray-50 transition">Go to Login</a>
      </div>
    </main>
  );
}
