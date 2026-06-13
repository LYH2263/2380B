import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

  const totalCount = await prisma.subscription.count({
    where: { userId: user.userId }
  })

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: user.userId },
    include: {
      novel: {
        include: {
          author: {
            select: { id: true, username: true, avatar: true }
          },
          _count: {
            select: { chapters: true, subscriptions: true }
          },
          chapters: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, createdAt: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  })

  return {
    subscriptions,
    totalCount,
    hasMore: page * limit < totalCount,
    currentPage: page,
    limit
  }
})
