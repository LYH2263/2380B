import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { hasPermission } from '~/server/utils/permissionMiddleware'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const commentId = Number(event.context.params?.commentId)

  if (!commentId || isNaN(commentId)) {
    throw createError({
      statusCode: 400,
      message: '无效的评论ID'
    })
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId }
  })

  if (!comment) {
    throw createError({
      statusCode: 404,
      message: '评论不存在'
    })
  }

  const isOwner = comment.userId === user.userId
  const canDeleteAny = await hasPermission(user.userId, user.role as any, 'comment:delete_any')

  if (!isOwner && !canDeleteAny) {
    throw createError({
      statusCode: 403,
      message: '无权删除此评论'
    })
  }

  await prisma.comment.delete({
    where: { id: commentId }
  })

  return { success: true }
})
