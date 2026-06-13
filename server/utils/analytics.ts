import prisma from '~/server/utils/prisma'

export function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setDate(start.getDate() - days + 1)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export function getTodayRange(): { start: Date; end: Date } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function getYesterdayRange(): { start: Date; end: Date } {
  const start = new Date()
  start.setDate(start.getDate() - 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setDate(end.getDate() - 1)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function getWeekRange(): { start: Date; end: Date } {
  return getDateRange(7)
}

export function getLastWeekRange(): { start: Date; end: Date } {
  const end = new Date()
  end.setDate(end.getDate() - 7)
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setDate(start.getDate() - 14)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export async function getPVForRange(start: Date, end: Date): Promise<number> {
  return prisma.analyticsEvent.count({
    where: {
      type: 'PAGE_VIEW',
      createdAt: { gte: start, lte: end }
    }
  })
}

export async function getUVForRange(start: Date, end: Date): Promise<number> {
  const events = await prisma.analyticsEvent.findMany({
    where: {
      type: 'PAGE_VIEW',
      createdAt: { gte: start, lte: end }
    },
    select: {
      userId: true,
      deviceId: true
    },
    distinct: ['userId', 'deviceId']
  })
  
  const uniqueVisitors = new Set<string>()
  events.forEach(e => {
    uniqueVisitors.add(e.userId?.toString() || e.deviceId || '')
  })
  
  return uniqueVisitors.size
}

export async function getActiveUsersForRange(start: Date, end: Date): Promise<number> {
  const events = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      userId: { not: null }
    },
    select: { userId: true },
    distinct: ['userId']
  })
  return events.length
}

export async function getDailyTrends(days: number) {
  const { start } = getDateRange(days)
  const dates: Date[] = []
  
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  
  const result = await Promise.all(
    dates.map(async (date) => {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      
      const [pv, uv] = await Promise.all([
        getPVForRange(dayStart, dayEnd),
        getUVForRange(dayStart, dayEnd)
      ])
      
      return {
        date: date.toISOString().split('T')[0],
        pv,
        uv
      }
    })
  )
  
  return result
}
