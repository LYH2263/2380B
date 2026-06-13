import { requireAuth } from '~/server/utils/auth'
import prisma from '~/server/utils/prisma'
import { getLevelByPoints, getLevelProgress, LEVELS } from '~/server/utils/levels'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)

  const query = getQuery(event)
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const pageSize = Math.min(100, parseInt(query.pageSize as string) || 20)
  const skip = (page - 1) * pageSize

  const [user, pointRecords, total] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        points: true,
        totalPoints: true,
        level: true,
      }
    }),
    prisma.pointRecord.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.pointRecord.count({
      where: { userId: authUser.userId },
    }),
  ])

  if (!user) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  const levelInfo = getLevelByPoints(user.totalPoints)
  const levelProgress = getLevelProgress(user.totalPoints)
  const nextLevel = LEVELS.find(l => l.level === user.level + 1)

  return {
    success: true,
    data: {
      user: {
        ...user,
        levelName: levelInfo.name,
        levelPrivileges: levelInfo.privileges,
        levelProgress,
        nextLevelPoints: nextLevel ? nextLevel.minPoints : null,
      },
      records: pointRecords,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      }
    }
  }
})
