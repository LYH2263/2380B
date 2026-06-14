import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { deleteTag } from '~/server/utils/tagService'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的标签ID'
    })
  }

  try {
    await deleteTag(id)
    return { success: true }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      message: e.message || '删除标签失败'
    })
  }
})
