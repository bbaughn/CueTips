import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueVerificationEmail } from "@/lib/verification";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // If the account exists but was never verified, treat this as a resend
    // rather than an error so the user isn't locked out by a stale signup.
    if (!existing.emailVerified) {
      try {
        await issueVerificationEmail(existing.id, existing.email);
      } catch {
        return NextResponse.json(
          { error: "Could not send verification email. Please try again." },
          { status: 500 }
        );
      }
      return NextResponse.json({ requiresVerification: true }, { status: 200 });
    }

    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || null },
  });

  try {
    await issueVerificationEmail(user.id, user.email);
  } catch {
    return NextResponse.json(
      { error: "Account created, but the verification email failed to send. Please use 'Resend'." },
      { status: 500 }
    );
  }

  return NextResponse.json({ requiresVerification: true }, { status: 201 });
}
