import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueVerificationEmail } from "@/lib/verification";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified) {
      try {
        await issueVerificationEmail(user.id, user.email);
      } catch {
        // Swallow send errors: we don't reveal account state to the caller.
      }
    }
  }

  // Always generic — never disclose whether the address is registered.
  return NextResponse.json({
    message: "If that email needs verification, we've sent a new link.",
  });
}
