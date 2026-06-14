import { recommendTags } from '~/server/utils/tagService'
import { z } from 'zod'

const recommendSchema = z.object({
  title: z.string().max(200).optional().default(''),
  description: z.string().max(5000).optional().default(''),
  limit: z.number().int().min(1).max(50).optional().default(10)
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = recommendSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const tags = await recommendTags(result.data.title, result.data.description, result.data.limit)
  return { tags }
})
