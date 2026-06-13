import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const role = query.role as string | undefined

  const where = role ? { role: role as any } : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        vipExpiresAt: true,
        createdAt: true,
        _count: {
          select: {
            novels: true,
            comments: true,
            favorites: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.user.count({ where })
  ])

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
