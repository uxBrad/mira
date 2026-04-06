import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { hashToken } from '../../../../lib/jwt'
import { sendVerificationEmail } from '../../../../lib/resend'

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({ where: { email: emailLower } })

    // Always return success to avoid email enumeration
    if (!user || user.emailVerified) {
      return NextResponse.json({ success: true })
    }

    const code = generateOtpCode()
    const tokenHash = hashToken(`verify:${emailLower}:${code}`)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })

    await sendVerificationEmail(emailLower, code)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Failed to resend verification email.' }, { status: 500 })
  }
}
