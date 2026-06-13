import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { buildChapterSegments, rebuildAllSegments } from '~/server/utils/searchService'
import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const { novelId, chapterId, rebuildAll } = body || {}

  if (rebuildAll) {
    requireAdmin(event)
    const result = await rebuildAllSegments()
    return {
      success: true,
      message: `成功重建 ${result.processed} 个章节的分段索引`
    }
  }

  if (chapterId) {
    const chapter = await prisma.chapter.findUnique({
      where: { id: Number(chapterId) },
      include: { novel: { select: { authorId: true } } }
    })

    if (!chapter) {
      throw createError({
        statusCode: 404,
        message: '章节不存在'
      })
    }

    if (chapter.novel.authorId !== user.userId && user.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        message: '无权限操作此章节'
      })
    }

    await buildChapterSegments(Number(chapterId))

    return {
      success: true,
      message: '章节分段索引重建成功'
    }
  }

  if (novelId) {
    const novel = await prisma.novel.findUnique({
      where: { id: Number(novelId) },
      select: { authorId: true }
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
        message: '无权限操作此小说'
      })
    }

    const chapters = await prisma.chapter.findMany({
      where: { novelId: Number(novelId) },
      select: { id: true }
    })

    for (const ch of chapters) {
      await buildChapterSegments(ch.id)
    }

    return {
      success: true,
      message: `小说 ${chapters.length} 个章节的分段索引重建成功`
    }
  }

  throw createError({
    statusCode: 400,
    message: '请指定 chapterId, novelId 或 rebuildAll'
  })
})
