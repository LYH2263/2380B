import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { getDateRange } from '~/server/utils/analytics'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const days = Number(query.days) || 7
  const { start, end } = getDateRange(days)

  const [
    homePageViews,
    novelDetailViews,
    chapterStarts,
    chapterCompletes
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: {
        type: 'PAGE_VIEW',
        path: '/',
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.analyticsEvent.count({
      where: {
        type: 'NOVEL_DETAIL_VIEW',
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.analyticsEvent.count({
      where: {
        type: 'CHAPTER_START',
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.analyticsEvent.count({
      where: {
        type: 'CHAPTER_COMPLETE',
        createdAt: { gte: start, lte: end }
      }
    })
  ])

  return {
    funnel: [
      { name: '访问首页', value: homePageViews },
      { name: '进入小说详情', value: novelDetailViews },
      { name: '开始阅读', value: chapterStarts },
      { name: '阅读完成', value: chapterCompletes }
    ]
  }
})
