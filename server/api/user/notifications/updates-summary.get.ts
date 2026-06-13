import { requireAuth } from '~/server/utils/auth'
import { getUnreadUpdatesSummary } from '~/server/utils/notificationService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  return await getUnreadUpdatesSummary(user.userId)
})
