import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { updateTag } from '~/server/utils/tagService'
import { z } from 'zod'

const tagUpdateSchema = z.object({
  name: z.string().min(1, '标签名称不能为空').max(50, '标签名称最多50个字符').optional(),
  description: z.string().max(500, '标签描述最多500个字符').optional().nullable(),
  category: z.enum(['GENRE', 'STYLE', 'ELEMENT', 'OTHER']).optional(),
  canonicalId: z.number().int().positive().optional().nullable()
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: '无效的标签ID'
    })
  }

  const body = await readBody(event)
  const result = tagUpdateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  try {
    const tag = await updateTag(id, result.data)
    return { success: true, tag }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      message: e.message || '更新标签失败'
    })
  }
})
