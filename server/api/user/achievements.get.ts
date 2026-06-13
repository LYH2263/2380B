import { requireAuth } from '~/server/utils/auth'
import prisma from '~/server/utils/prisma'
import { ACHIEVEMENT_DEFINITIONS } from '~/server/utils/achievements'
import { checkAchievements } from '~/server/utils/achievementService'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)

  const query = getQuery(event)
  const forceCheck = query.forceCheck === 'true'

  if (forceCheck) {
    await checkAchievements(authUser.userId)
  }

  const [allAchievements, userAchievements] = await Promise.all([
    prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { points: 'asc' }],
    }),
    prisma.userAchievement.findMany({
      where: { userId: authUser.userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    }),
  ])

  const unlockedAchievementIds = new Set(
    userAchievements.map(ua => ua.achievementId)
  )

  const achievementMap = new Map(allAchievements.map(a => [a.code, a]))

  const allDefsWithStatus = ACHIEVEMENT_DEFINITIONS.map(def => {
    const achievement = achievementMap.get(def.code)
    const userAchievement = achievement
      ? userAchievements.find(ua => ua.achievementId === achievement.id)
      : undefined

    return {
      code: def.code,
      name: def.name,
      description: def.description,
      icon: def.icon,
      points: def.points,
      category: def.category,
      criteria: def.criteria,
      isUnlocked: !!userAchievement,
      unlockedAt: userAchievement?.unlockedAt || null,
      dbId: achievement?.id || null,
    }
  })

  const unlockedCount = allDefsWithStatus.filter(a => a.isUnlocked).length
  const totalCount = allDefsWithStatus.length
  const progressPercent = Math.round((unlockedCount / totalCount) * 100)

  const grouped = allDefsWithStatus.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof allDefsWithStatus>)

  return {
    success: true,
    data: {
      achievements: allDefsWithStatus,
      groupedByCategory: grouped,
      stats: {
        unlocked: unlockedCount,
        total: totalCount,
        progressPercent,
        totalPointsEarned: userAchievements.reduce(
          (sum, ua) => sum + (ua.achievement?.points || 0),
          0
        ),
      },
      recentUnlocks: userAchievements.slice(0, 5).map(ua => ({
        code: ua.achievement.code,
        name: ua.achievement.name,
        icon: ua.achievement.icon,
        points: ua.achievement.points,
        unlockedAt: ua.unlockedAt,
      })),
    }
  }
})
