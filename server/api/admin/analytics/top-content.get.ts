import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { getDateRange } from '~/server/utils/analytics'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const days = Number(query.days) || 7
  const { start, end } = getDateRange(days)

  const [topNovels, topChapters] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ['novelId'],
      where: {
        type: { in: ['NOVEL_DETAIL_VIEW', 'CHAPTER_START'] },
        novelId: { not: null },
        createdAt: { gte: start, lte: end }
      },
      _count: { novelId: true },
      orderBy: { _count: { novelId: 'desc' } },
      take: 10
    }).then(async (results) => {
      const novelIds = results.map(r => r.novelId!).filter(Boolean)
      const novels = await prisma.novel.findMany({
        where: { id: { in: novelIds } },
        select: {
          id: true,
          title: true,
          author: { select: { username: true } }
        }
      })
      return results.map(r => {
        const novel = novels.find(n => n.id === r.novelId)
        return {
          id: r.novelId,
          title: novel?.title || '未知',
          author: novel?.author?.username || '未知',
          views: r._count.novelId
        }
      })
    }),

    prisma.chapterReadSession.groupBy({
      by: ['chapterId'],
      where: {
        createdAt: { gte: start, lte: end }
      },
      _count: { chapterId: true },
      _avg: { completionRate: true },
      orderBy: { _count: { chapterId: 'desc' } },
      take: 10
    }).then(async (results) => {
      const chapterIds = results.map(r => r.chapterId!).filter(Boolean)
      const chapters = await prisma.chapter.findMany({
        where: { id: { in: chapterIds } },
        select: {
          id: true,
          title: true,
          order: true,
          novel: {
            select: {
              id: true,
              title: true
            }
          }
        }
      })
      return results.map(r => {
        const chapter = chapters.find(c => c.id === r.chapterId)
        return {
          id: r.chapterId,
          title: chapter?.title || '未知',
          novelTitle: chapter?.novel?.title || '未知',
          novelId: chapter?.novel?.id,
          order: chapter?.order,
          views: r._count.chapterId,
          avgCompletionRate: Math.round(r._avg.completionRate || 0)
        }
      })
    })
  ])

  return {
    topNovels,
    topChapters
  }
})
