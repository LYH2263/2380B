import { requireAuth } from '~/server/utils/auth'
import { sendMessage } from '~/server/utils/messageService'
import { z } from 'zod'

const bodySchema = z.object({
  content: z.string().min(1).max(5000)
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const conversationId = Number(event.context.params?.id)

  if (!conversationId || isNaN(conversationId)) {
    throw createError({
      statusCode: 400,
      message: '无效的会话ID'
    })
  }

  const body = await readBody(event)
  const validated = bodySchema.safeParse(body)

  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: '消息内容不能为空'
    })
  }

  const { content } = validated.data

  if (!content.trim()) {
    throw createError({
      statusCode: 400,
      message: '消息内容不能为空'
    })
  }

  try {
    const message = await sendMessage({
      conversationId,
      senderId: user.userId,
      content: content.trim()
    })

    return {
      success: true,
      message
    }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      message: e.message || '发送消息失败'
    })
  }
})
