import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'
import { PERMISSION_DEFINITIONS } from '~/server/utils/permissions'
import type { Role } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const adminUser = await requirePermission(event, 'admin:permissions')
  const body = await readBody(event)

  const { role, permissionCodes } = body as { role: Role; permissionCodes: string[] }

  if (!role || !permissionCodes || !Array.isArray(permissionCodes)) {
    throw createError({
      statusCode: 400,
      message: '参数无效'
    })
  }

  const validRoles: Role[] = ['USER', 'ADMIN', 'AUTHOR', 'VIP', 'MODERATOR']
  if (!validRoles.includes(role)) {
    throw createError({
      statusCode: 400,
      message: '无效的角色'
    })
  }

  const validCodes = new Set(PERMISSION_DEFINITIONS.map(p => p.code))
  const filteredCodes = permissionCodes.filter((c: string) => validCodes.has(c as any))

  for (const code of filteredCodes) {
    const perm = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: PERMISSION_DEFINITIONS.find(p => p.code === code)?.name || code,
        description: PERMISSION_DEFINITIONS.find(p => p.code === code)?.description || '',
        category: PERMISSION_DEFINITIONS.find(p => p.code === code)?.category || '其他'
      }
    })

    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role,
          permissionId: perm.id
        }
      },
      update: {},
      create: {
        role,
        permissionId: perm.id
      }
    })
  }

  const existingPerms = await prisma.permission.findMany({
    where: { code: { in: filteredCodes } }
  })
  const existingPermIds = existingPerms.map(p => p.id)

  await prisma.rolePermission.deleteMany({
    where: {
      role,
      permissionId: { notIn: existingPermIds }
    }
  })

  return { success: true }
})
