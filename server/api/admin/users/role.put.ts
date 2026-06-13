import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'

export default defineEventHandler(async (event) => {
  const adminUser = await requirePermission(event, 'user:manage_role')
  const body = await readBody(event)

  const { userId, newRole, reason } = body

  if (!userId || !newRole) {
    throw createError({
      statusCode: 400,
      message: '参数无效'
    })
  }

  const validRoles = ['USER', 'ADMIN', 'AUTHOR', 'VIP', 'MODERATOR']
  if (!validRoles.includes(newRole)) {
    throw createError({
      statusCode: 400,
      message: '无效的角色'
    })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: '用户不存在'
    })
  }

  if (targetUser.role === newRole) {
    throw createError({
      statusCode: 400,
      message: '用户已是该角色'
    })
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role: newRole }
    })

    await tx.roleChangeLog.create({
      data: {
        userId,
        oldRole: targetUser.role,
        newRole,
        changedBy: adminUser.userId,
        reason: reason || null
      }
    })

    return { success: true }
  })

  return result
})
