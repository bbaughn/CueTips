import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/base-url";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function verificationUrl(token: string) {
  return `${getBaseUrl()}/verify?token=${token}`;
}

/**
 * Issues a fresh verification token for a user (replacing any prior ones) and
 * emails them the link. Throws if the email fails to send.
 */
export async function issueVerificationEmail(userId: string, email: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  await sendVerificationEmail(email, verificationUrl(token));
}

/**
 * Validates a raw token. On success, marks the user verified, clears their
 * tokens, and returns { ok: true }. Otherwise returns a reason.
 */
export async function consumeVerificationToken(
  token: string
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "expired" }> {
  if (!token) return { ok: false, reason: "invalid" };

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record) return { ok: false, reason: "invalid" };

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return { ok: false, reason: "expired" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { ok: true };
}
