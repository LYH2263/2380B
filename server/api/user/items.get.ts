import { requireAuth } from '~/server/utils/auth'
import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)

  const userItems = await prisma.userItem.findMany({
    where: { userId: authUser.userId },
    include: { shopItem: true },
    orderBy: { createdAt: 'desc' },
  })

  const now = new Date()
  const activeItems = userItems.filter(item => {
    if (!item.expiresAt) return true
    return item.expiresAt > now
  })

  const expiredCount = userItems.length - activeItems.length

  const grouped = activeItems.reduce((acc, item) => {
    const category = item.shopItem.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, typeof activeItems>)

  return {
    success: true,
    data: {
      allItems: userItems,
      activeItems,
      groupedByCategory: grouped,
      stats: {
        total: userItems.length,
        active: activeItems.length,
        expired: expiredCount,
      },
      categoryNames: {
        AVATAR_FRAME: '头像框',
        NICKNAME_COLOR: '昵称颜色',
        AD_FREE: '免广告特权',
        BADGE: '身份徽章',
        OTHER: '其他',
      } as Record<string, string>
    }
  }
})
