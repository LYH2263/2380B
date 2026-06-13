import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { hasPermission } from '~/server/utils/permissionMiddleware'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = Number(event.context.params?.id)

  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的小说ID'
    })
  })

  const novel = await prisma.novel.findUnique({
    where: { id },
    select: { authorId: true }
  })

  if (!novel) {
    throw createError({
      statusCode: 404,
      message: '小说不存在'
    })
  }

  const isOwner = novel.authorId === user.userId
  const canDeleteAny = await hasPermission(user.userId, user.role as any, 'novel:delete_any')

  if (!isOwner && !canDeleteAny) {
    throw createError({
      statusCode: 403,
      message: '无权删除此小说'
    })
  }

  await prisma.novel.delete({
    where: { id }
  })

  return { success: true }
})
