import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { hashToken } from '../../../../lib/jwt'
import { sendPasswordResetEmail } from '../../../../lib/resend'

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
    if (!user) {
      return NextResponse.json({ message: 'If an account exists, a reset code has been sent.' })
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

    const code = generateOtpCode()
    const tokenHash = hashToken(`reset:${emailLower}:${code}`)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    })

    await sendPasswordResetEmail(emailLower, code)

    return NextResponse.json({ message: 'If an account exists, a reset code has been sent.' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to send reset code.' }, { status: 500 })
  }
}
