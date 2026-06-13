import prisma from '~/server/utils/prisma'
import { requireAuth, isVipActive } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const userData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true, vipExpiresAt: true }
  })

  const active = userData?.role === 'VIP' && isVipActive(userData.vipExpiresAt)

  const memberships = await prisma.vipMembership.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' }
  })

  return {
    isVip: active,
    vipExpiresAt: userData?.vipExpiresAt,
    memberships
  }
})
