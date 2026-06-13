import { Prisma } from '@prisma/client'
import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const authorNovels = await prisma.novel.findMany({
    where: { authorId: user.userId },
    select: { id: true }
  })

  const novelIds = authorNovels.map(n => n.id)

  if (novelIds.length === 0) {
    return {
      retention: [],
      totalReaders: 0
    }
  }

  const cohortDays = 14
  const cohorts: { date: string; total: number; day1: number; day7: number; day14: number }[] = []

  for (let i = cohortDays; i >= 0; i--) {
    const cohortDate = new Date()
    cohortDate.setDate(cohortDate.getDate() - i)
    cohortDate.setHours(0, 0, 0, 0)
    const cohortEnd = new Date(cohortDate)
    cohortEnd.setHours(23, 59, 59, 999)

    const firstTimeReaders = await prisma.$queryRaw<Array<{ device_id: string; user_id: number | null }>>`
      SELECT DISTINCT 
        COALESCE(user_id::text, device_id) as reader_id,
        MIN(created_at) as first_read
      FROM chapter_read_sessions
      WHERE novel_id IN (${Prisma.join(novelIds)})
      AND created_at >= ${cohortDate}
      AND created_at <= ${cohortEnd}
      GROUP BY reader_id
    `

    const readerIds = firstTimeReaders.map((r: any) => r.reader_id)

    if (readerIds.length === 0) {
      cohorts.push({
        date: cohortDate.toISOString().split('T')[0],
        total: 0,
        day1: 0,
        day7: 0,
        day14: 0
      })
      continue
    }

    const day1Date = new Date(cohortDate)
    day1Date.setDate(day1Date.getDate() + 1)
    const day7Date = new Date(cohortDate)
    day7Date.setDate(day7Date.getDate() + 7)
    const day14Date = new Date(cohortDate)
    day14Date.setDate(day14Date.getDate() + 14)

    const [day1, day7, day14] = await Promise.all([
      i >= 1 ? prisma.chapterReadSession.findMany({
        where: {
          novelId: { in: novelIds },
          createdAt: { gte: day1Date, lte: new Date(day1Date.getTime() + 24 * 60 * 60 * 1000 - 1) }
        },
        select: { userId: true, deviceId: true }
      }).then(sessions => {
        const set = new Set(sessions.map(s => s.userId?.toString() || s.deviceId))
        return readerIds.filter(id => set.has(id)).length
      }) : Promise.resolve(0),

      i >= 7 ? prisma.chapterReadSession.findMany({
        where: {
          novelId: { in: novelIds },
          createdAt: { gte: day7Date, lte: new Date(day7Date.getTime() + 24 * 60 * 60 * 1000 - 1) }
        },
        select: { userId: true, deviceId: true }
      }).then(sessions => {
        const set = new Set(sessions.map(s => s.userId?.toString() || s.deviceId))
        return readerIds.filter(id => set.has(id)).length
      }) : Promise.resolve(0),

      i >= 14 ? prisma.chapterReadSession.findMany({
        where: {
          novelId: { in: novelIds },
          createdAt: { gte: day14Date, lte: new Date(day14Date.getTime() + 24 * 60 * 60 * 1000 - 1) }
        },
        select: { userId: true, deviceId: true }
      }).then(sessions => {
        const set = new Set(sessions.map(s => s.userId?.toString() || s.deviceId))
        return readerIds.filter(id => set.has(id)).length
      }) : Promise.resolve(0)
    ])

    cohorts.push({
      date: cohortDate.toISOString().split('T')[0],
      total: readerIds.length,
      day1: readerIds.length > 0 ? Math.round((day1 / readerIds.length) * 100) : 0,
      day7: readerIds.length > 0 ? Math.round((day7 / readerIds.length) * 100) : 0,
      day14: readerIds.length > 0 ? Math.round((day14 / readerIds.length) * 100) : 0
    })
  }

  const totalReaders = await prisma.chapterReadSession.findMany({
    where: { novelId: { in: novelIds } },
    select: { userId: true, deviceId: true },
    distinct: ['userId', 'deviceId']
  }).then(sessions => {
    const set = new Set<string>()
    sessions.forEach(s => set.add(s.userId?.toString() || s.deviceId))
    return set.size
  })

  return {
    retention: cohorts,
    totalReaders
  }
})
