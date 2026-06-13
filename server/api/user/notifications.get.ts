import { requireAuth } from '~/server/utils/auth'
import { getUserNotifications } from '~/server/utils/notificationService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

  return await getUserNotifications(user.userId, page, limit)
})
