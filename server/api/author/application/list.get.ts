import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:permissions')

  const query = getQuery(event)
  const status = query.status as string | undefined
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

  const where = status ? { status: status as any } : {}

  const [applications, total] = await Promise.all([
    prisma.authorApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, username: true, avatar: true, email: true }
        },
        reviewer: {
          select: { id: true, username: true }
        }
      }
    }),
    prisma.authorApplication.count({ where })
  ])

  return {
    applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
