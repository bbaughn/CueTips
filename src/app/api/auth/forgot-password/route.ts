import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issuePasswordResetEmail } from "@/lib/password-reset";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Only accounts with a password can reset one. Google-only accounts
    // (passwordHash === null) sign in with Google instead.
    if (user && user.passwordHash) {
      try {
        await issuePasswordResetEmail(user.id, user.email);
      } catch {
        // Swallow send errors: we don't reveal account state to the caller.
      }
    }
  }

  // Always generic — never disclose whether the address is registered.
  return NextResponse.json({
    message: "If an account exists for that email, we've sent a reset link.",
  });
}
