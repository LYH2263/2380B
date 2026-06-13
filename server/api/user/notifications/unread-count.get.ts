import { requireAuth } from '~/server/utils/auth'
import { getUnreadNotificationCount } from '~/server/utils/notificationService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  return await getUnreadNotificationCount(user.userId)
})
