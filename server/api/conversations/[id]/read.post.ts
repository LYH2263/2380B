import { requireAuth } from '~/server/utils/auth'
import { markConversationAsRead } from '~/server/utils/messageService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const conversationId = Number(event.context.params?.id)

  if (!conversationId || isNaN(conversationId)) {
    throw createError({
      statusCode: 400,
      message: '无效的会话ID'
    })
  }

  try {
    await markConversationAsRead(conversationId, user.userId)
    return {
      success: true
    }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      message: e.message || '标记已读失败'
    })
  }
})
