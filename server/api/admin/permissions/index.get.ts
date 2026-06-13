import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'
import { PERMISSION_DEFINITIONS, getRolePermissions, ROLE_LABELS, getAllCategories, getPermissionsByCategory } from '~/server/utils/permissions'
import type { Role } from '@prisma/client'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:permissions')

  const dbPermissions = await prisma.permission.findMany()
  const dbPermMap = new Map(dbPermissions.map(p => [p.code, p]))

  const rolePermissionRecords = await prisma.rolePermission.findMany({
    include: { permission: true }
  })

  const rolePermMap: Record<string, string[]> = {}
  for (const rp of rolePermissionRecords) {
    const roleKey = rp.role as string
    if (!rolePermMap[roleKey]) rolePermMap[roleKey] = []
    rolePermMap[roleKey].push(rp.permission.code)
  }

  const useDb = dbPermissions.length > 0

  const roles: Role[] = ['USER', 'ADMIN', 'AUTHOR', 'VIP', 'MODERATOR']
  const rolePermissions: Record<string, { name: string; permissions: { code: string; name: string; description: string; category: string; granted: boolean }[] }> = {}

  for (const role of roles) {
    const effectivePerms = useDb ? (rolePermMap[role] || []) : getRolePermissions(role)
    const permDetails = PERMISSION_DEFINITIONS.map(p => ({
      code: p.code,
      name: p.name,
      description: p.description,
      category: p.category,
      granted: effectivePerms.includes(p.code)
    }))

    rolePermissions[role] = {
      name: ROLE_LABELS[role],
      permissions: permDetails
    }
  }

  const categories = getAllCategories()
  const categoryPermissions: Record<string, { code: string; name: string; description: string }[]> = {}
  for (const cat of categories) {
    categoryPermissions[cat] = getPermissionsByCategory(cat).map(p => ({
      code: p.code,
      name: p.name,
      description: p.description
    }))
  }

  return {
    roles: rolePermissions,
    categories: categoryPermissions,
    allPermissions: PERMISSION_DEFINITIONS
  }
})
