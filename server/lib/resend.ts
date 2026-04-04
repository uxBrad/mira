import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@groundsforaccess.com'

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 480px;
  margin: 0 auto;
  padding: 40px 24px;
  color: #111827;
`

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your verification code — Grounds for Access',
    html: `
      <div style="${baseStyles}">
        <div style="width: 40px; height: 40px; background: #2563eb; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: bold; font-size: 18px;">G</span>
        </div>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Verify your email</h1>
        <p style="color: #6b7280; margin: 0 0 32px; line-height: 1.6;">
          Enter this code in the Grounds for Access app to verify your email and start your 7-day free trial.
        </p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">Verification code</p>
          <p style="margin: 0; font-size: 40px; font-weight: 800; letter-spacing: 0.15em; color: #111827; font-variant-numeric: tabular-nums;">${code}</p>
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin: 0;">
          This code expires in 24 hours. If you didn't create a Grounds for Access account, you can ignore this email.
        </p>
      </div>
    `
  })
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your password reset code — Grounds for Access',
    html: `
      <div style="${baseStyles}">
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Reset your password</h1>
        <p style="color: #6b7280; margin: 0 0 32px; line-height: 1.6;">
          Enter this code in the Grounds for Access app along with your new password.
        </p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">Reset code</p>
          <p style="margin: 0; font-size: 40px; font-weight: 800; letter-spacing: 0.15em; color: #111827; font-variant-numeric: tabular-nums;">${code}</p>
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin: 0;">
          This code expires in 1 hour. If you didn't request a password reset, you can ignore this email.
        </p>
      </div>
    `
  })
}
