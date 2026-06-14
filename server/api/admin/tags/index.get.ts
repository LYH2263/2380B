import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { getTags } from '~/server/utils/tagService'
import type { TagCategory } from '@prisma/client'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const search = (query.search as string) || ''
  const category = (query.category as TagCategory) || undefined
  const onlyCanonical = query.onlyCanonical === 'true'
  const sortBy = (query.sortBy as string) || 'useCount'
  const sortOrder = (query.sortOrder as string) || 'desc'

  const result = await getTags({
    page,
    limit,
    search,
    category,
    onlyCanonical,
    sortBy: sortBy as any,
    sortOrder: sortOrder as any
  })

  return result
})
