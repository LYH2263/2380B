import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'
import { isVipActive } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const adminUser = await requirePermission(event, 'admin:permissions')
  const body = await readBody(event)

  const { userId, durationDays, reason } = body

  if (!userId || !durationDays || durationDays <= 0) {
    throw createError({
      statusCode: 400,
      message: '参数无效'
    })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, vipExpiresAt: true }
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: '用户不存在'
    })
  }

  const startDate = new Date()
  const currentExpiry = targetUser.vipExpiresAt && isVipActive(targetUser.vipExpiresAt)
    ? new Date(targetUser.vipExpiresAt)
    : startDate
  const endDate = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000)

  const result = await prisma.$transaction(async (tx) => {
    const membership = await tx.vipMembership.create({
      data: {
        userId,
        startDate,
        endDate
      }
    })

    const oldRole = targetUser.role
    await tx.user.update({
      where: { id: userId },
      data: {
        role: 'VIP',
        vipExpiresAt: endDate,
        adFree: true
      }
    })

    await tx.roleChangeLog.create({
      data: {
        userId,
        oldRole: oldRole,
        newRole: 'VIP',
        changedBy: adminUser.userId,
        reason: reason || `开通VIP会员${durationDays}天`
      }
    })

    return membership
  })

  return {
    success: true,
    membership: result
  }
})
