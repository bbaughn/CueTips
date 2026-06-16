import { randomBytes, createHash } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour
const MIN_PASSWORD_LENGTH = 6;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function resetUrl(token: string) {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/reset-password?token=${token}`;
}

/**
 * Issues a fresh password-reset token for a user (replacing any prior ones)
 * and emails them the link. Throws if the email fails to send.
 */
export async function issuePasswordResetEmail(userId: string, email: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  await sendPasswordResetEmail(email, resetUrl(token));
}

/**
 * Validates a raw token and, on success, sets the user's new password, clears
 * their reset tokens, and marks the email verified (a working reset link proves
 * inbox control). Returns a reason on failure.
 */
export async function consumePasswordResetToken(
  token: string,
  newPassword: string
): Promise<
  { ok: true } | { ok: false; reason: "invalid" | "expired" | "weak_password" }
> {
  if (!token) return { ok: false, reason: "invalid" };
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "weak_password" };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record) return { ok: false, reason: "invalid" };

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
    return { ok: false, reason: "expired" };
  }

  const passwordHash = await hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, emailVerified: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { ok: true };
}
