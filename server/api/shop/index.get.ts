import prisma from '~/server/utils/prisma'
import { initializeShopItems } from '~/server/utils/shopItems'
import type { ItemCategory } from '@prisma/client'

export default defineEventHandler(async (event) => {
  await initializeShopItems()

  const query = getQuery(event)
  const category = query.category as ItemCategory | undefined

  const where: any = { isActive: true }
  if (category) {
    where.category = category
  }

  const items = await prisma.shopItem.findMany({
    where,
    orderBy: [{ category: 'asc' }, { price: 'asc' }],
  })

  const categories = Object.values(['AVATAR_FRAME', 'NICKNAME_COLOR', 'AD_FREE', 'BADGE', 'OTHER'])

  return {
    success: true,
    data: {
      items,
      categories,
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
