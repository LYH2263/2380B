import { getAuthUser } from '~/server/utils/auth'
import { getTotalUnreadCount } from '~/server/utils/messageService'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  if (!user) {
    return {
      success: true,
      totalUnread: 0
    }
  }

  const result = await getTotalUnreadCount(user.userId)

  return {
    success: true,
    totalUnread: result.totalUnread
  }
})
