import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'
import { getLevelByPoints, getLevelProgress } from '~/server/utils/levels'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  if (!user) {
    return { user: null }
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      role: true,
      points: true,
      totalPoints: true,
      level: true,
      inviteCode: true,
      nicknameColor: true,
      avatarFrame: true,
      adFree: true,
      vipExpiresAt: true,
      _count: {
        select: {
          achievements: true
        }
      }
    }
  })

  if (!userData) {
    return { user: null }
  }

  const levelInfo = getLevelByPoints(userData.totalPoints)
  const levelProgress = getLevelProgress(userData.totalPoints)

  return {
    user: {
      ...userData,
      levelName: levelInfo.name,
      levelPrivileges: levelInfo.privileges,
      levelProgress,
      achievementCount: userData._count.achievements,
    }
  }
})
