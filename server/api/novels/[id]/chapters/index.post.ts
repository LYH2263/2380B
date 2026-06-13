import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { chapterSchema } from '~/server/utils/validators'
import { calculateChapterPoints } from '~/server/utils/levels'
import { awardPublishChapter } from '~/server/utils/pointsService'
import { triggerNovelUpdateNotifications } from '~/server/utils/notificationService'
import { buildChapterSegments } from '~/server/utils/searchService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)
  const body = await readBody(event)

  if (!novelId || isNaN(novelId)) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID'
    })
  }

  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { authorId: true, title: true }
  })

  if (!novel) {
    throw createError({
      statusCode: 404,
      message: '小说不存在'
    })
  }

  if (novel.authorId !== user.userId && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: '无权为此小说添加章节'
    })
  }

  const result = chapterSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { title, content, order } = result.data

  const maxOrder = await prisma.chapter.findFirst({
    where: { novelId },
    orderBy: { order: 'desc' },
    select: { order: true }
  })

  const newOrder = order || (maxOrder?.order || 0) + 1

  const wordCount = content.replace(/\s/g, '').length

  const chapter = await prisma.chapter.create({
    data: {
      novelId,
      title,
      content,
      order: newOrder,
      wordCount
    }
  })

  const pointsEarned = calculateChapterPoints(wordCount)
  const pointsResult = await awardPublishChapter(user.userId, wordCount, title)

  const notificationResult = await triggerNovelUpdateNotifications({
    novelId,
    chapterId: chapter.id,
    chapterTitle: title,
    novelTitle: novel.title
  })

  try {
    await buildChapterSegments(chapter.id)
  } catch (e: any) {
    console.warn('Failed to build chapter segments for chapter', chapter.id, e.message)
  }

  return {
    success: true,
    chapter,
    pointsEarned,
    wordCount,
    unlockedAchievements: pointsResult.unlockedAchievements || [],
    notificationResult
  }
})
