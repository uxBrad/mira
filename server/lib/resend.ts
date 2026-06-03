import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'james@jecture.co'

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="48" height="48" style="display:block;border-radius:10px">
  <rect width="256" height="256" fill="#610000" rx="40"/>
  <circle cx="88" cy="128" r="10" fill="#ffffff"/>
  <path d="M88 108 A20 20 0 0 1 88 148" stroke="#ffffff" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.95"/>
  <path d="M88 90 A38 38 0 0 1 88 166" stroke="#ffffff" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.75"/>
  <path d="M88 72 A56 56 0 0 1 88 184" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.55"/>
  <path d="M88 54 A74 74 0 0 1 88 202" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.35"/>
  <rect x="162" y="80" width="18" height="96" rx="3" fill="#ffffff" opacity="0.9"/>
  <rect x="162" y="80" width="56" height="18" rx="3" fill="#ffffff" opacity="0.9"/>
  <rect x="162" y="119" width="44" height="18" rx="3" fill="#ffffff" opacity="0.9"/>
  <rect x="162" y="158" width="56" height="18" rx="3" fill="#ffffff" opacity="0.9"/>
</svg>`

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 480px;
  margin: 0 auto;
  padding: 40px 24px;
  color: #111827;
`

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your verification code — manuA11y',
    html: `
      <div style="${baseStyles}">
        <div style="margin-bottom: 24px;">${LOGO_SVG}</div>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Verify your email</h1>
        <p style="color: #6b7280; margin: 0 0 32px; line-height: 1.6;">
          Enter this code in manuA11y to verify your email and start your 30-day free trial.
        </p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">Verification code</p>
          <p style="margin: 0; font-size: 40px; font-weight: 800; letter-spacing: 0.15em; color: #111827; font-variant-numeric: tabular-nums;">${code}</p>
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin: 0;">
          This code expires in 24 hours. If you didn't create a manuA11y account, you can ignore this email.
        </p>
      </div>
    `
  })
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your password reset code — manuA11y',
    html: `
      <div style="${baseStyles}">
        <div style="margin-bottom: 24px;">${LOGO_SVG}</div>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Reset your password</h1>
        <p style="color: #6b7280; margin: 0 0 32px; line-height: 1.6;">
          Enter this code in manuA11y along with your new password.
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
