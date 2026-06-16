"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import brushed from "@/images/brushed.jpg";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    setError("");
    setNotice("");
    setLoading(true);
    const res = await fetch("/api/auth/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    setNotice(data.message || "If that email needs verification, we've sent a new link.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setNeedsVerification(false);
    setLoading(true);

    if (isRegister) {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      // Account created but not yet verified — do not sign in.
      setNeedsVerification(true);
      setNotice(
        `We sent a verification link to ${email}. Click it to finish creating your account.`
      );
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.code === "EmailNotVerified") {
        setNeedsVerification(true);
        setError("Please verify your email before signing in.");
      } else {
        setError("Invalid email or password");
      }
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Full-viewport brushed-metal background */}
      <Image
        src={brushed}
        alt=""
        fill
        priority
        sizes="100vw"
        placeholder="blur"
        className="object-cover object-center -z-10"
      />
      {/* Scrim for text legibility over the gray metal (disabled for now) */}
      {/* <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/75 via-black/55 to-black/80" /> */}

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Hero / branding */}
        <section className="flex-1 flex flex-col justify-center px-8 py-14 lg:px-16 lg:py-12">
          <div className="max-w-xl rounded-2xl border border-zinc-700/60 bg-zinc-950/80 p-8 sm:p-10 shadow-2xl backdrop-blur-md">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-amber-400/90">
              The only tagging system just for vinyl DJs
            </p>
            <h1 className="mt-4 text-6xl sm:text-7xl font-bold tracking-tight text-white">
              Cue<span className="text-amber-500">Tips</span>
            </h1>
            <h2 className="mt-5 text-2xl sm:text-3xl font-semibold text-zinc-100">
              Mix In Key, Even On Vinyl
            </h2>
            <p className="mt-3 text-base sm:text-lg text-zinc-300">
              Tag, organize, and sticker your vinyl for perfect blends.
            </p>
          </div>
        </section>

        {/* Auth */}
        <section className="flex items-center justify-center px-6 pb-14 lg:px-12 lg:py-12">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700/60 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-md">
            <p className="text-zinc-400 mb-6">
              {isRegister ? "Create an account" : "Sign in to your collection"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />

              {!isRegister && (
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-zinc-400 hover:text-white transition"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}
              {notice && <p className="text-amber-400 text-sm">{notice}</p>}
              {needsVerification && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || !email}
                  className="text-sm text-amber-400 hover:text-amber-300 transition disabled:opacity-50"
                >
                  Resend verification email
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition disabled:opacity-50"
              >
                {loading
                  ? "..."
                  : isRegister
                    ? "Create Account"
                    : "Sign In"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full py-3 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold rounded-lg transition flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
              </svg>
              Sign in with Google
            </button>

            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setNotice("");
                setNeedsVerification(false);
              }}
              className="mt-4 text-sm text-zinc-400 hover:text-white transition"
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "Need an account? Register"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
