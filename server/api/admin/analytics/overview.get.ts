import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import {
  getTodayRange,
  getYesterdayRange,
  getWeekRange,
  getLastWeekRange,
  getPVForRange,
  getUVForRange,
  getActiveUsersForRange,
  calculateGrowth
} from '~/server/utils/analytics'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const today = getTodayRange()
  const yesterday = getYesterdayRange()
  const thisWeek = getWeekRange()
  const lastWeek = getLastWeekRange()

  const [
    todayPV,
    todayUV,
    yesterdayPV,
    yesterdayUV,
    weekActiveUsers,
    lastWeekActiveUsers,
    todayNewUsers,
    yesterdayNewUsers,
    todayNewNovels,
    yesterdayNewNovels,
    todayNewChapters,
    yesterdayNewChapters
  ] = await Promise.all([
    getPVForRange(today.start, today.end),
    getUVForRange(today.start, today.end),
    getPVForRange(yesterday.start, yesterday.end),
    getUVForRange(yesterday.start, yesterday.end),
    getActiveUsersForRange(thisWeek.start, thisWeek.end),
    getActiveUsersForRange(lastWeek.start, lastWeek.end),
    prisma.user.count({
      where: { createdAt: { gte: today.start, lte: today.end } }
    }),
    prisma.user.count({
      where: { createdAt: { gte: yesterday.start, lte: yesterday.end } }
    }),
    prisma.novel.count({
      where: { createdAt: { gte: today.start, lte: today.end } }
    }),
    prisma.novel.count({
      where: { createdAt: { gte: yesterday.start, lte: yesterday.end } }
    }),
    prisma.chapter.count({
      where: { createdAt: { gte: today.start, lte: today.end } }
    }),
    prisma.chapter.count({
      where: { createdAt: { gte: yesterday.start, lte: yesterday.end } }
    })
  ])

  return {
    todayPV: {
      value: todayPV,
      growth: calculateGrowth(todayPV, yesterdayPV)
    },
    todayUV: {
      value: todayUV,
      growth: calculateGrowth(todayUV, yesterdayUV)
    },
    weekActiveUsers: {
      value: weekActiveUsers,
      growth: calculateGrowth(weekActiveUsers, lastWeekActiveUsers)
    },
    newUsers: {
      value: todayNewUsers,
      growth: calculateGrowth(todayNewUsers, yesterdayNewUsers)
    },
    newNovels: {
      value: todayNewNovels,
      growth: calculateGrowth(todayNewNovels, yesterdayNewNovels)
    },
    newChapters: {
      value: todayNewChapters,
      growth: calculateGrowth(todayNewChapters, yesterdayNewChapters)
    }
  }
})
