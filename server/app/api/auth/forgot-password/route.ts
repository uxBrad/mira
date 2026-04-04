import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { generateSecureToken, hashToken } from '../../../../lib/jwt'
import { sendPasswordResetEmail } from '../../../../lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    // Always return success to avoid email enumeration
    if (!user) {
      return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' })
    }

    // Delete any existing reset tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

    const token = generateSecureToken()
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    })

    await sendPasswordResetEmail(user.email, token)

    return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to send reset email.' }, { status: 500 })
  }
}
