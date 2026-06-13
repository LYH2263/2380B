import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { hasPermission } from '~/server/utils/permissionMiddleware'

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
  const canViewAny = await hasPermission(user.userId, user.role as any, 'chapter:view_any')

  if (!isOwner && !canViewAny) {
    throw createError({
      statusCode: 403,
      message: '无权查看此章节的版本内容'
    })
  }

  const version = await prisma.chapterVersion.findFirst({
    where: { id: versionId, chapterId },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          avatar: true
        }
      }
    }
  })

  if (!version) {
    throw createError({
      statusCode: 404,
      message: '版本不存在'
    })
  }

  return {
    id: version.id,
    versionNum: version.versionNum,
    title: version.title,
    content: version.content,
    wordCount: version.wordCount,
    wordDiff: version.wordDiff,
    type: version.type,
    isKeyNode: version.isKeyNode,
    restoredFromVersionId: version.restoredFromVersionId,
    createdById: version.createdById,
    createdBy: version.createdBy,
    createdAt: version.createdAt
  }
})
