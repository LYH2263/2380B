import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { getDateRange, getPVForRange, getUVForRange } from '~/server/utils/analytics'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const query = getQuery(event)
  const days = Number(query.days) || 30
  const { start, end } = getDateRange(days)

  const authorNovels = await prisma.novel.findMany({
    where: { authorId: user.userId },
    select: { id: true, title: true }
  })

  const novelIds = authorNovels.map(n => n.id)

  if (novelIds.length === 0) {
    return {
      totalReads: 0,
      totalReaders: 0,
      avgCompletionRate: 0,
      totalReadingTime: 0,
      trends: [],
      novels: []
    }
  }

  const [
    totalSessions,
    totalReaders,
    avgCompletion,
    totalDuration
  ] = await Promise.all([
    prisma.chapterReadSession.count({
      where: {
        novelId: { in: novelIds },
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.chapterReadSession.findMany({
      where: {
        novelId: { in: novelIds },
        createdAt: { gte: start, lte: end }
      },
      select: { userId: true, deviceId: true },
      distinct: ['userId', 'deviceId']
    }).then(sessions => {
      const readers = new Set<string>()
      sessions.forEach(s => readers.add(s.userId?.toString() || s.deviceId))
      return readers.size
    }),
    prisma.chapterReadSession.aggregate({
      where: {
        novelId: { in: novelIds },
        createdAt: { gte: start, lte: end }
      },
      _avg: { completionRate: true }
    }),
    prisma.chapterReadSession.aggregate({
      where: {
        novelId: { in: novelIds },
        createdAt: { gte: start, lte: end }
      },
      _sum: { duration: true }
    })
  ])

  const dates: Date[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }

  const trends = await Promise.all(
    dates.map(async (date) => {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const reads = await prisma.chapterReadSession.count({
        where: {
          novelId: { in: novelIds },
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      })

      const readers = await prisma.chapterReadSession.findMany({
        where: {
          novelId: { in: novelIds },
          createdAt: { gte: dayStart, lte: dayEnd }
        },
        select: { userId: true, deviceId: true },
        distinct: ['userId', 'deviceId']
      }).then(sessions => {
        const set = new Set<string>()
        sessions.forEach(s => set.add(s.userId?.toString() || s.deviceId))
        return set.size
      })

      return {
        date: date.toISOString().split('T')[0],
        reads,
        readers
      }
    })
  )

  const novelStats = await Promise.all(
    authorNovels.map(async (novel) => {
      const [reads, readers, avgComp] = await Promise.all([
        prisma.chapterReadSession.count({
          where: {
            novelId: novel.id,
            createdAt: { gte: start, lte: end }
          }
        }),
        prisma.chapterReadSession.findMany({
          where: {
            novelId: novel.id,
            createdAt: { gte: start, lte: end }
          },
          select: { userId: true, deviceId: true },
          distinct: ['userId', 'deviceId']
        }).then(sessions => {
          const set = new Set<string>()
          sessions.forEach(s => set.add(s.userId?.toString() || s.deviceId))
          return set.size
        }),
        prisma.chapterReadSession.aggregate({
          where: {
            novelId: novel.id,
            createdAt: { gte: start, lte: end }
          },
          _avg: { completionRate: true }
        })
      ])

      return {
        id: novel.id,
        title: novel.title,
        reads,
        readers,
        avgCompletionRate: Math.round(avgComp._avg.completionRate || 0)
      }
    })
  )

  return {
    totalReads: totalSessions,
    totalReaders,
    avgCompletionRate: Math.round(avgCompletion._avg.completionRate || 0),
    totalReadingTime: totalDuration._sum.duration || 0,
    trends,
    novels: novelStats.sort((a, b) => b.reads - a.reads)
  }
})
