import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { hashToken } from '../../../../lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 })
    }

    const tokenHash = hashToken(`verify:${token}`)
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    })

    if (!record || record.expiresAt < new Date() || record.usedAt) {
      return NextResponse.json({ error: 'Invalid or expired verification link.' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      }),
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() }
      })
    ])

    // Redirect to the app with success
    return NextResponse.redirect(
      `${process.env.APP_URL || 'http://localhost:3001'}/verify-success`
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 })
  }
}
