import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'james@jecture.co'

const LOGO_IMG = `<img src="https://echo-production-02ef.up.railway.app/logo.png" width="56" height="56" alt="Mira" style="display:block;" />`

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 480px;
  margin: 0 auto;
  padding: 40px 24px;
  color: #111827;
`

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your verification code — Mira',
    html: `
      <div style="${baseStyles}">
        <div style="margin-bottom: 24px;">${LOGO_IMG}</div>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Verify your email</h1>
        <p style="color: #6b7280; margin: 0 0 32px; line-height: 1.6;">
          Enter this code in Mira to verify your email and start your 30-day free trial.
        </p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">Verification code</p>
          <p style="margin: 0; font-size: 40px; font-weight: 800; letter-spacing: 0.15em; color: #111827; font-variant-numeric: tabular-nums;">${code}</p>
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin: 0;">
          This code expires in 24 hours. If you didn't create a Mira account, you can ignore this email.
        </p>
      </div>
    `
  })
  if (error) throw new Error(`Resend failed to send verification email: ${error.message}`)
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your password reset code — Mira',
    html: `
      <div style="${baseStyles}">
        <div style="margin-bottom: 24px;">${LOGO_IMG}</div>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Reset your password</h1>
        <p style="color: #6b7280; margin: 0 0 32px; line-height: 1.6;">
          Enter this code in Mira along with your new password.
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
  if (error) throw new Error(`Resend failed to send password reset email: ${error.message}`)
}
