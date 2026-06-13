import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { getDateRange } from '~/server/utils/analytics'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const query = getQuery(event)
  const novelId = Number(query.novelId)
  const days = Number(query.days) || 30
  const { start, end } = getDateRange(days)

  const novel = await prisma.novel.findFirst({
    where: { id: novelId, authorId: user.userId },
    include: {
      chapters: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
          wordCount: true
        }
      }
    }
  })

  if (!novel) {
    throw createError({
      statusCode: 404,
      message: '小说不存在或无权限'
    })
  }

  const chapterIds = novel.chapters.map(c => c.id)

  const chapterStats = await Promise.all(
    novel.chapters.map(async (chapter) => {
      const [reads, avgComp, avgDuration] = await Promise.all([
        prisma.chapterReadSession.count({
          where: {
            chapterId: chapter.id,
            createdAt: { gte: start, lte: end }
          }
        }),
        prisma.chapterReadSession.aggregate({
          where: {
            chapterId: chapter.id,
            createdAt: { gte: start, lte: end }
          },
          _avg: { completionRate: true }
        }),
        prisma.chapterReadSession.aggregate({
          where: {
            chapterId: chapter.id,
            createdAt: { gte: start, lte: end }
          },
          _avg: { duration: true }
        })
      ])

      return {
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        wordCount: chapter.wordCount,
        reads,
        avgCompletionRate: Math.round(avgComp._avg.completionRate || 0),
        avgReadingTime: Math.round(avgDuration._avg.duration || 0)
      }
    })
  )

  return {
    novel: {
      id: novel.id,
      title: novel.title
    },
    chapters: chapterStats
  }
})
