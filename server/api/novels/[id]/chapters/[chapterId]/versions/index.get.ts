import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { hasPermission } from '~/server/utils/permissionMiddleware'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)
  const chapterId = Number(event.context.params?.chapterId)

  if (!novelId || isNaN(novelId) || !chapterId || isNaN(chapterId)) {
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
      message: '无权查看此章节的版本历史'
    })
  }

  const versions = await prisma.chapterVersion.findMany({
    where: { chapterId },
    orderBy: { versionNum: 'desc' },
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

  return {
    versions: versions.map((v) => ({
      id: v.id,
      versionNum: v.versionNum,
      title: v.title,
      wordCount: v.wordCount,
      wordDiff: v.wordDiff,
      type: v.type,
      isKeyNode: v.isKeyNode,
      restoredFromVersionId: v.restoredFromVersionId,
      createdById: v.createdById,
      createdBy: v.createdBy,
      createdAt: v.createdAt
    }))
  }
})
