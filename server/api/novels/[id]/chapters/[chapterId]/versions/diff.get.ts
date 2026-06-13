import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { hasPermission } from '~/server/utils/permissionMiddleware'
import { computeDiff, formatDiffAsHtml } from '~/server/utils/versionControl'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const novelId = Number(event.context.params?.id)
  const chapterId = Number(event.context.params?.chapterId)

  const query = getQuery(event)
  const fromVersionId = Number(query.from)
  const toVersionId = Number(query.to)

  if (!novelId || isNaN(novelId) || !chapterId || isNaN(chapterId) || !fromVersionId || isNaN(fromVersionId) || !toVersionId || isNaN(toVersionId)) {
    throw createError({
      statusCode: 400,
      message: '无效的参数，请提供 from 和 to 版本ID'
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
      message: '无权查看此章节的版本对比'
    })
  }

  const [fromVersion, toVersion] = await Promise.all([
    prisma.chapterVersion.findFirst({ where: { id: fromVersionId, chapterId } }),
    prisma.chapterVersion.findFirst({ where: { id: toVersionId, chapterId } })
  ])

  if (!fromVersion || !toVersion) {
    throw createError({
      statusCode: 404,
      message: '指定的版本不存在'
    })
  }

  const diff = computeDiff(fromVersion.content, toVersion.content)
  const diffHtml = formatDiffAsHtml(diff)

  const insertions = diff.filter((t) => t.type === 'insert').reduce((sum, t) => sum + t.value.length, 0)
  const deletions = diff.filter((t) => t.type === 'delete').reduce((sum, t) => sum + t.value.length, 0)

  return {
    fromVersion: {
      id: fromVersion.id,
      versionNum: fromVersion.versionNum,
      title: fromVersion.title,
      wordCount: fromVersion.wordCount,
      createdAt: fromVersion.createdAt
    },
    toVersion: {
      id: toVersion.id,
      versionNum: toVersion.versionNum,
      title: toVersion.title,
      wordCount: toVersion.wordCount,
      createdAt: toVersion.createdAt
    },
    diff,
    diffHtml,
    stats: {
      insertions,
      deletions,
      wordDiff: toVersion.wordCount - fromVersion.wordCount
    }
  }
})
