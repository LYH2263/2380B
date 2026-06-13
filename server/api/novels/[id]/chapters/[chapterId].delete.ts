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
  })

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
  const canDeleteAny = await hasPermission(user.userId, user.role as any, 'chapter:delete_any')

  if (!isOwner && !canDeleteAny) {
    throw createError({
      statusCode: 403,
      message: '无权删除此章节'
    })
  }

  await prisma.chapter.delete({
    where: { id: chapterId }
  })

  return { success: true }
})
