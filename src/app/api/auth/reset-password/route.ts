import { NextResponse } from "next/server";
import { consumePasswordResetToken } from "@/lib/password-reset";

export async function POST(req: Request) {
  const { token, password } = await req.json();

  const result = await consumePasswordResetToken(token, password);

  if (!result.ok) {
    const message =
      result.reason === "weak_password"
        ? "Password must be at least 6 characters."
        : result.reason === "expired"
          ? "This reset link has expired. Please request a new one."
          : "This reset link is invalid or has already been used.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
