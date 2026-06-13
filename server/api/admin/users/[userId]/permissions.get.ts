import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'
import { PERMISSION_DEFINITIONS } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:permissions')

  const userId = Number(event.context.params?.userId)
  if (!userId || isNaN(userId)) {
    throw createError({
      statusCode: 400,
      message: '无效的用户ID'
    })
  }

  const overrides = await prisma.userPermissionOverride.findMany({
    where: { userId },
    include: { permission: true }
  })

  const userPerms = overrides.map(o => ({
    code: o.permission.code,
    name: o.permission.name,
    isGranted: o.isGranted
  }))

  return { overrides: userPerms }
})
