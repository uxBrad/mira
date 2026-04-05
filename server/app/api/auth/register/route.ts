import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma'
import { hashToken } from '../../../../lib/jwt'
import { sendVerificationEmail } from '../../../../lib/resend'
import { stripe } from '../../../../lib/stripe'

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()

    const existing = await prisma.user.findUnique({ where: { email: emailLower } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Create Stripe customer (skip if Stripe not configured)
    let stripeCustomerId = 'pending'
    try {
      const stripeCustomer = await stripe.customers.create({
        email: emailLower,
        name: name || undefined,
        metadata: { source: 'grounds-for-access' }
      })
      stripeCustomerId = stripeCustomer.id
    } catch {
      // Stripe not configured — will be created on first subscription attempt
    }

    // Create user + subscription in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: emailLower,
          passwordHash,
          name: name || null
        }
      })

      await tx.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId,
          status: 'trialing'
        }
      })

      return user
    })

    // Generate 6-digit OTP code for email verification
    const code = generateOtpCode()
    const tokenHash = hashToken(`verify:${emailLower}:${code}`)

    // Store token (reuse passwordResetToken table)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })

    const isDev = process.env.NODE_ENV === 'development'

    if (isDev) {
      // Auto-verify in development so you don't need email/Resend configured
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      })
    } else {
      await sendVerificationEmail(emailLower, code)
    }

    return NextResponse.json(
      {
        message: isDev
          ? 'Account created. (Dev mode: email auto-verified — go straight to login.)'
          : 'Account created. Check your email for a 6-digit verification code.',
        devAutoVerified: isDev
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
