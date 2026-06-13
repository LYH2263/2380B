import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { ratingSchema } from '~/server/utils/validators'
import { awardRating } from '~/server/utils/pointsService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)
  const body = await readBody(event)

  if (!novelId || isNaN(novelId)) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID'
    })
  }

  const result = ratingSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { score } = result.data

  // 检查小说是否存在
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

  // 检查是否首次评分
  const existingRating = await prisma.rating.findUnique({
    where: {
      userId_novelId: {
        userId: user.userId,
        novelId
      }
    }
  })
  const isFirstRating = !existingRating

  // 更新或创建评分
  const rating = await prisma.rating.upsert({
    where: {
      userId_novelId: {
        userId: user.userId,
        novelId
      }
    },
    update: { score },
    create: {
      userId: user.userId,
      novelId,
      score
    }
  })

  // 计算新的平均评分
  const ratings = await prisma.rating.findMany({
    where: { novelId },
    select: { score: true }
  })

  const avgRating = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length

  let pointsEarned = 0
  let unlockedAchievements: any[] = []
  if (isFirstRating) {
    const pointsResult = await awardRating(user.userId, novel.title, score)
    pointsEarned = pointsResult.success ? 3 : 0
    unlockedAchievements = pointsResult.unlockedAchievements || []
  }

  return {
    success: true,
    rating: rating.score,
    avgRating: Math.round(avgRating * 10) / 10,
    pointsEarned,
    isFirstRating,
    unlockedAchievements,
  }
})
