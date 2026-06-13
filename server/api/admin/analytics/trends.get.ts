import { requireAdmin } from '~/server/utils/auth'
import { getDailyTrends } from '~/server/utils/analytics'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const days = Number(query.days) || 30

  const trends = await getDailyTrends(days)

  return {
    trends
  }
})
