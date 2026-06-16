import { Resend } from "resend";

// Must be an address on a domain you've verified in Resend.
const FROM = process.env.EMAIL_FROM ?? "CueTips <noreply@cuetips.app>";

// Lazily constructed so importing this module (e.g. during build) never throws
// when RESEND_API_KEY is absent — only sending an email requires it.
let client: Resend | null = null;
function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

export async function sendVerificationEmail(to: string, url: string) {
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: "Verify your CueTips email",
    text: `Welcome to CueTips!\n\nConfirm your email address by opening this link:\n${url}\n\nThis link expires in 24 hours. If you didn't create a CueTips account, you can ignore this email.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
        <h1 style="font-size: 22px; margin-bottom: 8px;">Welcome to CueTips</h1>
        <p style="color: #52525b;">Confirm your email address to finish setting up your account.</p>
        <p style="margin: 28px 0;">
          <a href="${url}"
             style="background: #d97706; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; display: inline-block;">
            Verify email
          </a>
        </p>
        <p style="color: #71717a; font-size: 13px;">Or paste this link into your browser:<br/>
          <a href="${url}" style="color: #d97706;">${url}</a>
        </p>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 28px;">
          This link expires in 24 hours. If you didn't create a CueTips account, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(to: string, url: string) {
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: "Reset your CueTips password",
    text: `We received a request to reset your CueTips password.\n\nReset it by opening this link:\n${url}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
        <h1 style="font-size: 22px; margin-bottom: 8px;">Reset your password</h1>
        <p style="color: #52525b;">We received a request to reset your CueTips password.</p>
        <p style="margin: 28px 0;">
          <a href="${url}"
             style="background: #d97706; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; display: inline-block;">
            Reset password
          </a>
        </p>
        <p style="color: #71717a; font-size: 13px;">Or paste this link into your browser:<br/>
          <a href="${url}" style="color: #d97706;">${url}</a>
        </p>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 28px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
