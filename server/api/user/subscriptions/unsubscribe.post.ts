import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const { novelIds } = body

  if (!Array.isArray(novelIds) || novelIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: '请提供要取消订阅的小说ID列表'
    })
  }

  const validIds = novelIds.map(id => Number(id)).filter(id => !isNaN(id))

  if (validIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID列表'
    })
  }

  const result = await prisma.subscription.deleteMany({
    where: {
      userId: user.userId,
      novelId: { in: validIds }
    }
  })

  return {
    success: true,
    unsubscribedCount: result.count,
    message: `成功取消订阅 ${result.count} 部小说`
  }
})
