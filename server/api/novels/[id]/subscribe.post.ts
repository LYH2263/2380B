import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)

  if (!novelId || isNaN(novelId)) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { id: true, title: true }
  })

  if (!novel) {
    throw createError({
      statusCode: 404,
      message: '小说不存在'
    })
  }

  const existingSubscription = await prisma.subscription.findUnique({
    where: {
      userId_novelId: {
        userId: user.userId,
        novelId
      }
    }
  })

  if (existingSubscription) {
    await prisma.subscription.delete({
      where: { id: existingSubscription.id }
    })
    return { success: true, subscribed: false }
  } else {
    await prisma.subscription.create({
      data: {
        userId: user.userId,
        novelId
      }
    })
    return { success: true, subscribed: true }
  }
})
