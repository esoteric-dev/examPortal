"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Login failed");
      if (data?.role === "teacher") router.replace("/teacher");
      else router.replace("/student");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8 flex items-center justify-center bg-gray-50">
      <form onSubmit={handleLogin} className="w-full max-w-sm border border-gray-200 rounded-xl p-8 space-y-6 bg-white shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 text-center">Login</h1>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Password</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}
        <button
          type="submit"
          className="rounded-lg bg-blue-600 text-white px-4 py-3 disabled:opacity-60 w-full hover:bg-blue-700 transition-colors font-medium"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg space-y-2">
          <div className="font-semibold text-gray-800">Demo Accounts:</div>
          <div>• student@example.com / student123 (Regular)</div>
          <div>• teacher@example.com / teacher123 (Teacher)</div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-600">👑</span>
            <span className="font-semibold text-yellow-700">premium@example.com / premium123 (Premium)</span>
          </div>
        </div>
      </form>
    </main>
  );
}


