import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'
import { isVipActive } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const adminUser = await requirePermission(event, 'admin:permissions')
  const body = await readBody(event)

  const { userId, reason } = body

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: '用户ID不能为空'
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

  if (!isVipActive(targetUser.vipExpiresAt) && targetUser.role !== 'VIP') {
    throw createError({
      statusCode: 400,
      message: '该用户不是VIP会员'
    })
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.vipMembership.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    })

    const oldRole = targetUser.role
    await tx.user.update({
      where: { id: userId },
      data: {
        role: 'USER',
        vipExpiresAt: null,
        adFree: false
      }
    })

    await tx.roleChangeLog.create({
      data: {
        userId,
        oldRole: oldRole,
        newRole: 'USER',
        changedBy: adminUser.userId,
        reason: reason || 'VIP会员到期或手动撤销'
      }
    })

    return { success: true }
  })

  return result
})
