import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import {
  signAccessToken,
  verifyRefreshToken,
  hashToken,
  generateSecureToken
} from '../../../../lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json()
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required.' }, { status: 400 })
    }

    // Verify JWT structure
    const payload = verifyRefreshToken(refreshToken)

    // Check it's in our DB (not revoked)
    const tokenHash = hashToken(refreshToken)
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })

    if (!stored || stored.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired refresh token.' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 })
    }

    const newAccessToken = signAccessToken({ userId: user.id, email: user.email })

    // Rotate refresh token
    const newRefreshTokenRaw = generateSecureToken()
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: {
        tokenHash: hashToken(newRefreshTokenRaw),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })

    return NextResponse.json({ token: newAccessToken, refreshToken: newRefreshTokenRaw })
  } catch {
    return NextResponse.json({ error: 'Invalid refresh token.' }, { status: 401 })
  }
}
