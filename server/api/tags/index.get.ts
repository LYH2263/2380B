import { getPopularTags, searchTags, getRelatedTags, recommendTags } from '~/server/utils/tagService'
import type { TagCategory } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = (query.type as string) || 'popular'

  switch (type) {
    case 'popular': {
      const limit = Number(query.limit) || 30
      const category = (query.category as TagCategory) || undefined
      const tags = await getPopularTags(limit, category)
      return { tags }
    }

    case 'search': {
      const q = (query.q as string) || ''
      const limit = Number(query.limit) || 10
      const tags = await searchTags(q, limit, true)
      return { tags }
    }

    case 'related': {
      const tagId = Number(query.tagId)
      if (!tagId || isNaN(tagId)) {
        throw createError({
          statusCode: 400,
          message: '无效的标签ID'
        })
      }
      const limit = Number(query.limit) || 10
      const tags = await getRelatedTags(tagId, limit)
      return { tags }
    }

    case 'recommend': {
      const title = (query.title as string) || ''
      const description = (query.description as string) || ''
      const limit = Number(query.limit) || 10
      const tags = await recommendTags(title, description, limit)
      return { tags }
    }

    default:
      throw createError({
        statusCode: 400,
        message: '无效的查询类型'
      })
  }
})
