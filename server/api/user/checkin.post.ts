import { requireAuth } from '~/server/utils/auth'
import { prisma } from '~/server/utils/prisma'
import { getCheckinReward, getLevelByPoints, getLevelProgress } from '~/server/utils/levels'
import { addPoints, deductPoints } from '~/server/utils/pointsService'

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)

  const body = await readBody(event)
  const { date: targetDateStr } = body || {}

  const today = new Date()
  const todayStart = startOfDay(today)

  let targetDate: Date
  let isRetro = false

  if (targetDateStr) {
    targetDate = startOfDay(new Date(targetDateStr))
    if (targetDate >= todayStart) {
      throw createError({ statusCode: 400, message: '只能补签过去的日期' })
    }
    if (today.getTime() - targetDate.getTime() > 30 * 24 * 60 * 60 * 1000) {
      throw createError({ statusCode: 400, message: '只能补签最近30天内的日期' })
    }
    isRetro = true
  } else {
    targetDate = todayStart
  }

  const existingCheckIn = await prisma.checkIn.findUnique({
    where: {
      userId_date: {
        userId: authUser.userId,
        date: targetDate,
      }
    }
  })

  if (existingCheckIn) {
    throw createError({
      statusCode: 400,
      message: isRetro ? '该日期已补签' : '今天已经签到过了'
    })
  }

  if (isRetro) {
    const user = await prisma.user.findUnique({ where: { id: authUser.userId } })
    if (!user || user.points < 20) {
      throw createError({ statusCode: 400, message: '积分不足，补签需要20积分' })
    }
    await deductPoints(authUser.userId, 20, 'RETRO_CHECKIN', `补签${targetDate.toISOString().split('T')[0]}`)
  }

  const allCheckIns = await prisma.checkIn.findMany({
    where: { userId: authUser.userId },
    orderBy: { date: 'desc' }
  })

  const allCheckInDates = new Set(
    allCheckIns.map(c => startOfDay(c.date).toISOString().split('T')[0])
  )
  allCheckInDates.add(targetDate.toISOString().split('T')[0])

  let consecutiveDays = 0
  const checkDate = new Date(todayStart)
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0]
    if (allCheckInDates.has(dateStr)) {
      consecutiveDays++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (i === 0) {
      checkDate.setDate(checkDate.getDate() - 1)
      continue
    } else {
      break
    }
  }

  const rewardPoints = getCheckinReward(consecutiveDays)
  const source = isRetro ? 'CHECKIN' : 'CHECKIN'
  const description = isRetro
    ? `补签${targetDate.toISOString().split('T')[0]}`
    : `每日签到，连续${consecutiveDays}天`

  let bonusPoints = 0
  let bonusDescription: string | undefined
  if (!isRetro && consecutiveDays % 7 === 0) {
    bonusPoints = Math.floor(rewardPoints * 0.5)
    bonusDescription = `连续签到${consecutiveDays}天额外奖励`
  }

  await prisma.checkIn.create({
    data: {
      userId: authUser.userId,
      date: targetDate,
      isRetro,
      bonus: bonusPoints,
    }
  })

  const result = await addPoints(authUser.userId, rewardPoints + bonusPoints, source, description + (bonusDescription ? ` + ${bonusDescription}` : ''))

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { points: true, totalPoints: true, level: true }
  })

  const levelInfo = getLevelByPoints(user?.totalPoints || 0)

  return {
    success: true,
    data: {
      isRetro,
      date: targetDate.toISOString().split('T')[0],
      rewardPoints,
      bonusPoints,
      totalPointsEarned: rewardPoints + bonusPoints,
      consecutiveDays,
      totalCheckInDays: allCheckInDates.size,
      userPoints: user?.points || 0,
      userTotalPoints: user?.totalPoints || 0,
      userLevel: user?.level || 1,
      levelName: levelInfo.name,
      levelProgress: getLevelProgress(user?.totalPoints || 0),
      unlockedAchievements: result.unlockedAchievements || [],
    }
  }
})
