import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:permissions')

  const query = getQuery(event)
  const userId = Number(query.userId)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

  const where = userId ? { userId } : {}

  const [logs, total] = await Promise.all([
    prisma.roleChangeLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, username: true, avatar: true }
        },
        changedByUser: {
          select: { id: true, username: true, avatar: true }
        }
      }
    }),
    prisma.roleChangeLog.count({ where })
  ])

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
