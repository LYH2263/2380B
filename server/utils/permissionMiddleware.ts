import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { getRolePermissions } from '~/server/utils/permissions'
import type { PermissionCode } from '~/server/utils/permissions'
import type { H3Event } from 'h3'
import type { Role } from '@prisma/client'

export async function getUserPermissions(userId: number, role: Role): Promise<Set<PermissionCode>> {
  const rolePerms = getRolePermissions(role)
  const permSet = new Set<PermissionCode>(rolePerms)

  const overrides = await prisma.userPermissionOverride.findMany({
    where: { userId },
    include: { permission: true }
  })

  for (const override of overrides) {
    const code = override.permission.code as PermissionCode
    if (override.isGranted) {
      permSet.add(code)
    } else {
      permSet.delete(code)
    }
  }

  return permSet
}

export async function requirePermission(event: H3Event, permission: PermissionCode) {
  const user = requireAuth(event)

  const permissions = await getUserPermissions(user.userId, user.role as Role)
  if (!permissions.has(permission)) {
    throw createError({
      statusCode: 403,
      message: '权限不足'
    })
  }

  return user
}

export async function requireAnyPermission(event: H3Event, permissions: PermissionCode[]) {
  const user = requireAuth(event)

  const userPerms = await getUserPermissions(user.userId, user.role as Role)
  const hasAny = permissions.some(p => userPerms.has(p))
  if (!hasAny) {
    throw createError({
      statusCode: 403,
      message: '权限不足'
    })
  }

  return user
}

export async function requireAllPermissions(event: H3Event, permissions: PermissionCode[]) {
  const user = requireAuth(event)

  const userPerms = await getUserPermissions(user.userId, user.role as Role)
  const hasAll = permissions.every(p => userPerms.has(p))
  if (!hasAll) {
    throw createError({
      statusCode: 403,
      message: '权限不足'
    })
  }

  return user
}

export async function hasPermission(userId: number, role: Role, permission: PermissionCode): Promise<boolean> {
  const permissions = await getUserPermissions(userId, role)
  return permissions.has(permission)
}
