import { requireAuth } from '~/server/utils/auth'
import { prisma } from '~/server/utils/prisma'
import { getCheckinReward, CHECKIN_REWARDS, RETRO_CHECKIN_COST, getLevelByPoints, getLevelProgress } from '~/server/utils/levels'

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = []
  const lastDay = new Date(year, month + 1, 0).getDate()
  for (let day = 1; day <= lastDay; day++) {
    dates.push(new Date(year, month, day))
  }
  return dates
}

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)

  const today = new Date()
  const todayStart = startOfDay(today)
  const year = today.getFullYear()
  const month = today.getMonth()

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: {
      id: true,
      username: true,
      avatar: true,
      points: true,
      totalPoints: true,
      level: true,
    }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)

  const checkIns = await prisma.checkIn.findMany({
    where: {
      userId: authUser.userId,
      date: { gte: monthStart, lte: monthEnd }
    },
    orderBy: { date: 'asc' }
  })

  const allCheckIns = await prisma.checkIn.findMany({
    where: { userId: authUser.userId },
    orderBy: { date: 'desc' }
  })

  const checkInDates = new Set(
    checkIns.map(c => startOfDay(c.date).getTime())
  )
  const allCheckInDates = new Set(
    allCheckIns.map(c => startOfDay(c.date).toISOString().split('T')[0])
  )

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

  const hasCheckedInToday = checkInDates.has(todayStart.getTime())
  const nextReward = getCheckinReward(consecutiveDays + (hasCheckedInToday ? 1 : 1))
  const todayReward = hasCheckedInToday ? getCheckinReward(consecutiveDays) : 0

  const monthDates = getMonthDates(year, month)
  const calendar = monthDates.map(date => ({
    date: date.toISOString().split('T')[0],
    day: date.getDate(),
    isCheckedIn: checkInDates.has(startOfDay(date).getTime()),
    isRetro: checkIns.find(c =>
      startOfDay(c.date).getTime() === startOfDay(date).getTime()
    )?.isRetro || false,
    isToday: startOfDay(date).getTime() === todayStart.getTime(),
    isFuture: date > today,
    weekDay: date.getDay(),
  }))

  const totalCheckInDays = allCheckIns.length

  const levelInfo = getLevelByPoints(user.totalPoints)
  const levelProgress = getLevelProgress(user.totalPoints)

  return {
    success: true,
    data: {
      user: {
        ...user,
        levelName: levelInfo.name,
        levelPrivileges: levelInfo.privileges,
        levelProgress,
      },
      calendar,
      consecutiveDays,
      totalCheckInDays,
      hasCheckedInToday,
      todayReward,
      nextReward,
      retroCost: RETRO_CHECKIN_COST,
      rewardRules: CHECKIN_REWARDS,
      monthInfo: {
        year,
        month: month + 1,
        monthName: `${year}年${month + 1}月`
      }
    }
  }
})
