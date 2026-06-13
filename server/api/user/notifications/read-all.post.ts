import { requireAuth } from '~/server/utils/auth'
import { markAllNotificationsAsRead } from '~/server/utils/notificationService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const result = await markAllNotificationsAsRead(user.userId)

  return {
    success: true,
    updatedCount: result.count
  }
})
