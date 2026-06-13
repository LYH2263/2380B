import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { hasPermission } from '~/server/utils/permissionMiddleware'
import { createChapterVersion } from '~/server/utils/versionControl'
import { buildChapterSegments } from '~/server/utils/searchService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)
  const chapterId = Number(event.context.params?.chapterId)
  const versionId = Number(event.context.params?.versionId)

  if (!novelId || isNaN(novelId) || !chapterId || isNaN(chapterId) || !versionId || isNaN(versionId)) {
    throw createError({
      statusCode: 400,
      message: '无效的参数'
    })
  }

  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, novelId },
    include: {
      novel: { select: { authorId: true } }
    }
  })

  if (!chapter) {
    throw createError({
      statusCode: 404,
      message: '章节不存在'
    })
  }

  const isOwner = chapter.novel.authorId === user.userId
  const canEditAny = await hasPermission(user.userId, user.role as any, 'chapter:edit_any')

  if (!isOwner && !canEditAny) {
    throw createError({
      statusCode: 403,
      message: '无权恢复此章节的版本'
    })
  }

  const targetVersion = await prisma.chapterVersion.findFirst({
    where: { id: versionId, chapterId }
  })

  if (!targetVersion) {
    throw createError({
      statusCode: 404,
      message: '目标版本不存在'
    })
  }

  const wordCount = targetVersion.content.replace(/\s/g, '').length

  const updatedChapter = await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      title: targetVersion.title,
      content: targetVersion.content,
      wordCount
    }
  })

  await createChapterVersion({
    chapterId,
    title: targetVersion.title,
    content: targetVersion.content,
    createdById: user.userId,
    type: 'RESTORE',
    restoredFromVersionId: versionId
  })

  try {
    await buildChapterSegments(chapterId)
  } catch (e: any) {
    console.warn('Failed to rebuild chapter segments for chapter', chapterId, e.message)
  }

  return {
    success: true,
    chapter: updatedChapter,
    restoredFromVersion: {
      id: targetVersion.id,
      versionNum: targetVersion.versionNum
    }
  }
})
