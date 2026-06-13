import { getAuthUser } from '~/server/utils/auth'
import { getUserByUsername } from '~/server/utils/messageService'
import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const username = event.context.params?.username as string
  const currentUser = getAuthUser(event)

  if (!username) {
    throw createError({
      statusCode: 400,
      message: '用户名不能为空'
    })
  }

  const user = await getUserByUsername(username)

  if (!user) {
    throw createError({
      statusCode: 404,
      message: '用户不存在'
    })
  }

  let isFollowing = false
  let conversationId: number | null = null

  if (currentUser && currentUser.userId !== user.id) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: currentUser.userId, user2Id: user.id },
          { user1Id: user.id, user2Id: currentUser.userId }
        ]
      },
      select: { id: true }
    })
    conversationId = conversation?.id || null
  }

  return {
    success: true,
    user: {
      ...user,
      isSelf: currentUser?.userId === user.id,
      isFollowing,
      conversationId
    }
  }
})
