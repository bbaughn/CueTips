"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid or has already been used.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not reset your password.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-amber-500 mb-3">
          Password updated
        </h2>
        <p className="text-zinc-400 mb-8">
          Your password has been changed. You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="inline-block w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-zinc-400 mb-8">Choose a new password for your account.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition disabled:opacity-50"
        >
          {loading ? "..." : "Reset password"}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-4 inline-block text-sm text-zinc-400 hover:text-white transition"
      >
        Back to sign in
      </Link>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-white mb-2">CueTips</h1>
        <Suspense fallback={<p className="text-zinc-400">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
