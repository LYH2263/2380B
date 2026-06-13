import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const chapterId = Number(event.context.params?.chapterId)

  if (!chapterId || isNaN(chapterId)) {
    throw createError({
      statusCode: 400,
      message: '无效的章节ID'
    })
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId }
  })

  if (!chapter) {
    throw createError({
      statusCode: 404,
      message: '章节不存在'
    })
  }

  if (!chapter.deletedAt) {
    throw createError({
      statusCode: 400,
      message: '该章节不在回收站中，无法永久删除'
    })
  }

  await prisma.chapter.delete({
    where: { id: chapterId }
  })

  return {
    success: true
  }
})
