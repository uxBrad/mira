import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { hashToken } from '../../../../lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()
    const tokenHash = hashToken(`verify:${emailLower}:${code}`)

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    })

    if (!record) {
      return NextResponse.json({ error: 'Invalid code. Please check your email and try again.' }, { status: 400 })
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This code has expired. Please register again.' }, { status: 400 })
    }

    if (record.usedAt) {
      return NextResponse.json({ error: 'This code has already been used.' }, { status: 400 })
    }

    if (record.user.email !== emailLower) {
      return NextResponse.json({ error: 'Invalid code.' }, { status: 400 })
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 })
  }
}
