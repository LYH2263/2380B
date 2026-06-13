import { requireAuth } from '~/server/utils/auth'
import { getUserConversations } from '~/server/utils/messageService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const conversations = await getUserConversations(user.userId)

  return {
    success: true,
    conversations
  }
})
