import { NextRequest } from 'next/server'
import { verifyAccessToken, getAuthHeader, JwtPayload } from './jwt'
import { prisma } from './prisma'

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ user: { id: string; email: string; name: string | null } } | null> {
  const token = getAuthHeader(request)
  if (!token) return null

  try {
    const payload = verifyAccessToken(token) as JwtPayload
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true }
    })
    return user ? { user } : null
  } catch {
    return null
  }
}
