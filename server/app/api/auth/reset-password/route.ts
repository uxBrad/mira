import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma'
import { hashToken } from '../../../../lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const { email, code, password } = await request.json()

    if (!email || !code || !password) {
      return NextResponse.json({ error: 'Email, code, and password are required.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()
    const tokenHash = hashToken(`reset:${emailLower}:${code}`)

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    })

    if (!record) {
      return NextResponse.json(
        { error: 'Invalid code. Please check your email and try again.' },
        { status: 400 }
      )
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    if (record.usedAt) {
      return NextResponse.json({ error: 'This code has already been used.' }, { status: 400 })
    }

    if (record.user.email !== emailLower) {
      return NextResponse.json({ error: 'Invalid code.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() }
      }),
      // Revoke all refresh tokens — force re-login on all devices
      prisma.refreshToken.deleteMany({ where: { userId: record.userId } })
    ])

    return NextResponse.json({ message: 'Password reset successfully.' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 })
  }
}
