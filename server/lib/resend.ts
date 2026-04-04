import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)

const APP_URL = process.env.APP_URL || 'http://localhost:3001'
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@groundsforaccess.com'

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `grounds-for-access://verify-email?token=${token}`

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Verify your email — Grounds for Access',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <div style="width: 40px; height: 40px; background: #2563eb; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: bold; font-size: 18px;">G</span>
        </div>
        <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 8px;">Verify your email</h1>
        <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
          Thanks for creating a Grounds for Access account. Click the button below to verify your email and start your 7-day free trial.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px;">
          Verify email address
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          If you didn't create this account, you can ignore this email.<br>
          This link expires in 24 hours.
        </p>
      </div>
    `
  })
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `grounds-for-access://reset-password?token=${token}`

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset your password — Grounds for Access',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 8px;">Reset your password</h1>
        <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
          We received a request to reset the password for your Grounds for Access account.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px;">
          Reset password
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          If you didn't request a password reset, you can ignore this email.<br>
          This link expires in 1 hour.
        </p>
      </div>
    `
  })
}
