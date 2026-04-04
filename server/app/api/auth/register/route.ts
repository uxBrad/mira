import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma'
import { generateSecureToken, hashToken } from '../../../../lib/jwt'
import { sendVerificationEmail } from '../../../../lib/resend'
import { stripe } from '../../../../lib/stripe'

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

    // Create Stripe customer
    const stripeCustomer = await stripe.customers.create({
      email: emailLower,
      name: name || undefined,
      metadata: { source: 'grounds-for-access' }
    })

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
          stripeCustomerId: stripeCustomer.id,
          status: 'trialing',
          // Trial start is set when email is verified
        }
      })

      return user
    })

    // Send verification email
    const verificationToken = generateSecureToken()
    // Store token hash as part of user metadata (simple approach: use a dedicated field)
    // For simplicity, we use the PasswordResetToken table with a short-lived token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(`verify:${verificationToken}`),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })

    await sendVerificationEmail(emailLower, verificationToken)

    return NextResponse.json(
      { message: 'Account created. Please check your email to verify your account.' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
