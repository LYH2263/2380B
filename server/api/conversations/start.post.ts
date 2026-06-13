import { requireAuth } from '~/server/utils/auth'
import { getOrCreateConversation } from '~/server/utils/messageService'
import { z } from 'zod'

const bodySchema = z.object({
  targetUserId: z.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const validated = bodySchema.safeParse(body)
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: '无效的请求参数'
    })
  }

  const { targetUserId } = validated.data

  if (targetUserId === user.userId) {
    throw createError({
      statusCode: 400,
      message: '不能给自己发私信'
    })
  }

  const conversation = await getOrCreateConversation(user.userId, targetUserId)

  return {
    success: true,
    conversationId: conversation.id
  }
})
