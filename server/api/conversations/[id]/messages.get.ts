import { requireAuth } from '~/server/utils/auth'
import { getConversationMessages } from '~/server/utils/messageService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const conversationId = Number(event.context.params?.id)

  if (!conversationId || isNaN(conversationId)) {
    throw createError({
      statusCode: 400,
      message: '无效的会话ID'
    })
  }

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Math.min(Number(query.limit) || 30, 100)

  try {
    const result = await getConversationMessages(conversationId, user.userId, page, limit)
    return {
      success: true,
      ...result
    }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      message: e.message || '获取消息失败'
    })
  }
})
