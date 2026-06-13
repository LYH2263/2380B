import { requireAuth } from '~/server/utils/auth'
import { markNotificationAsRead } from '~/server/utils/notificationService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const notificationId = Number(event.context.params?.id)

  if (!notificationId || isNaN(notificationId)) {
    throw createError({
      statusCode: 400,
      message: '无效的通知ID'
    })
  }

  try {
    await markNotificationAsRead(notificationId, user.userId)
    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message
    })
  }
})
