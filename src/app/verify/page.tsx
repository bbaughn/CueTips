import Link from "next/link";
import { consumeVerificationToken } from "@/lib/verification";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await consumeVerificationToken(token ?? "");

  const heading = result.ok
    ? "Email verified"
    : result.reason === "expired"
      ? "Link expired"
      : "Invalid link";

  const message = result.ok
    ? "Your email address is confirmed. You can now sign in to your collection."
    : result.reason === "expired"
      ? "This verification link has expired. Sign in to request a new one."
      : "This verification link is invalid or has already been used.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">CueTips</h1>
        <h2 className="text-xl font-semibold text-amber-500 mb-3">{heading}</h2>
        <p className="text-zinc-400 mb-8">{message}</p>
        <Link
          href="/login"
          className="inline-block w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
