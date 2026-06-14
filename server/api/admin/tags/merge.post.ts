import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { mergeTags } from '~/server/utils/tagService'
import { z } from 'zod'

const mergeSchema = z.object({
  fromTagIds: z.array(z.number().int().positive()).min(1, '至少选择一个要合并的标签'),
  toTagId: z.number().int().positive('目标标签ID无效')
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody(event)
  const result = mergeSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  try {
    const mergedTag = await mergeTags(result.data.fromTagIds, result.data.toTagId)
    return { success: true, tag: mergedTag }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      message: e.message || '合并标签失败'
    })
  }
})
