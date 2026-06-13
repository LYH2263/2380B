import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'
import { PERMISSION_DEFINITIONS } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:permissions')

  const body = await readBody(event)
  const { userId, permissionCode, isGranted } = body

  if (!userId || !permissionCode || typeof isGranted !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: '参数无效'
    })
  }

  const permDef = PERMISSION_DEFINITIONS.find(p => p.code === permissionCode)
  if (!permDef) {
    throw createError({
      statusCode: 400,
      message: '无效的权限代码'
    })
  }

  const perm = await prisma.permission.upsert({
    where: { code: permissionCode },
    update: {},
    create: {
      code: permissionCode,
      name: permDef.name,
      description: permDef.description,
      category: permDef.category
    }
  })

  const override = await prisma.userPermissionOverride.upsert({
    where: {
      userId_permissionId: {
        userId,
        permissionId: perm.id
      }
    },
    update: { isGranted },
    create: {
      userId,
      permissionId: perm.id,
      isGranted
    }
  })

  return { success: true, override }
})
