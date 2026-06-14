import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { createTag } from '~/server/utils/tagService'
import { z } from 'zod'

const tagCreateSchema = z.object({
  name: z.string().min(1, '标签名称不能为空').max(50, '标签名称最多50个字符'),
  description: z.string().max(500, '标签描述最多500个字符').optional().or(z.literal('')),
  category: z.enum(['GENRE', 'STYLE', 'ELEMENT', 'OTHER']).optional(),
  canonicalId: z.number().int().positive().optional().nullable()
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody(event)
  const result = tagCreateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  try {
    const tag = await createTag(result.data)
    return { success: true, tag }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      message: e.message || '创建标签失败'
    })
  }
})
