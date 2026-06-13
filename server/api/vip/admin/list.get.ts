import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:permissions')

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const activeOnly = query.activeOnly === 'true'

  const now = new Date()
  const where = activeOnly ? { isActive: true, endDate: { gt: now } } : {}

  const [memberships, total] = await Promise.all([
    prisma.vipMembership.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, username: true, avatar: true, email: true }
        }
      }
    }),
    prisma.vipMembership.count({ where })
  ])

  return {
    memberships,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
