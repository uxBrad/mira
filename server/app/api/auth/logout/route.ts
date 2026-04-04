import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getAuthHeader, verifyAccessToken } from '../../../../lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const token = getAuthHeader(request)
    if (token) {
      const payload = verifyAccessToken(token)
      // Delete all refresh tokens for user (logout all devices)
      await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } })
    }
    return NextResponse.json({ success: true })
  } catch {
    // Even if token is invalid, return success — client has already cleared local session
    return NextResponse.json({ success: true })
  }
}
