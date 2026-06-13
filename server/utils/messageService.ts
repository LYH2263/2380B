import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

export interface CreateConversationOptions {
  user1Id: number
  user2Id: number
}

export interface SendMessageOptions {
  conversationId: number
  senderId: number
  content: string
}

export async function getOrCreateConversation(user1Id: number, user2Id: number) {
  const [smallerId, largerId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id]

  let conversation = await prisma.conversation.findUnique({
    where: {
      user1Id_user2Id: {
        user1Id: smallerId,
        user2Id: largerId
      }
    },
    include: {
      user1: { select: { id: true, username: true, avatar: true } },
      user2: { select: { id: true, username: true, avatar: true } },
      lastMessage: true
    }
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        user1Id: smallerId,
        user2Id: largerId
      },
      include: {
        user1: { select: { id: true, username: true, avatar: true } },
        user2: { select: { id: true, username: true, avatar: true } },
        lastMessage: true
      }
    })
  }

  return conversation
}

export async function getUserConversations(userId: number) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { user1Id: userId },
        { user2Id: userId }
      ]
    },
    include: {
      user1: { select: { id: true, username: true, avatar: true } },
      user2: { select: { id: true, username: true, avatar: true } },
      lastMessage: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
          readByReceiver: true
        }
      }
    },
    orderBy: {
      lastMessageAt: 'desc'
    }
  })

  return conversations.map(conv => {
    const isUser1 = conv.user1Id === userId
    const otherUser = isUser1 ? conv.user2 : conv.user1
    const unreadCount = isUser1 ? conv.unreadCount1 : conv.unreadCount2

    return {
      id: conv.id,
      otherUser,
      lastMessage: conv.lastMessage,
      lastMessagePreview: conv.lastMessagePreview,
      lastMessageAt: conv.lastMessageAt,
      unreadCount
    }
  })
}

export async function getConversationMessages(
  conversationId: number,
  userId: number,
  page: number = 1,
  limit: number = 30
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { user1Id: true, user2Id: true }
  })

  if (!conversation) {
    throw new Error('会话不存在')
  }

  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    throw new Error('无权访问该会话')
  }

  const totalCount = await prisma.message.count({
    where: { conversationId }
  })

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { id: true, username: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  })

  return {
    messages: messages.reverse(),
    totalCount,
    hasMore: page * limit < totalCount,
    currentPage: page,
    limit
  }
}

export async function sendMessage(options: SendMessageOptions) {
  const { conversationId, senderId, content } = options

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { user1Id: true, user2Id: true }
  })

  if (!conversation) {
    throw new Error('会话不存在')
  }

  if (conversation.user1Id !== senderId && conversation.user2Id !== senderId) {
    throw new Error('无权发送消息')
  }

  const receiverId = conversation.user1Id === senderId ? conversation.user2Id : conversation.user1Id
  const isSenderUser1 = senderId === conversation.user1Id

  const messagePreview = content.length > 200 ? content.substring(0, 197) + '...' : content

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content
    },
    include: {
      sender: { select: { id: true, username: true, avatar: true } }
    }
  })

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageId: message.id,
      lastMessagePreview: messagePreview,
      lastMessageAt: message.createdAt,
      unreadCount1: isSenderUser1 ? { increment: 1 } : undefined,
      unreadCount2: !isSenderUser1 ? { increment: 1 } : undefined
    }
  })

  return message
}

export async function markConversationAsRead(conversationId: number, userId: number) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { user1Id: true, user2Id: true }
  })

  if (!conversation) {
    throw new Error('会话不存在')
  }

  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    throw new Error('无权访问该会话')
  }

  const isUser1 = userId === conversation.user1Id
  const updateData: Prisma.ConversationUpdateInput = isUser1
    ? { unreadCount1: 0 }
    : { unreadCount2: 0 }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: updateData
  })

  const receiverId = isUser1 ? conversation.user2Id : conversation.user1Id

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: receiverId,
      readByReceiver: false
    },
    data: {
      readByReceiver: true
    }
  })

  return { success: true }
}

export async function getTotalUnreadCount(userId: number) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { user1Id: userId },
        { user2Id: userId }
      ]
    },
    select: {
      user1Id: true,
      user2Id: true,
      unreadCount1: true,
      unreadCount2: true
    }
  })

  const total = conversations.reduce((sum, conv) => {
    const isUser1 = conv.user1Id === userId
    return sum + (isUser1 ? conv.unreadCount1 : conv.unreadCount2)
  }, 0)

  return { totalUnread: total }
}

export async function getUserByUsername(username: string) {
  return await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      level: true,
      nicknameColor: true,
      createdAt: true,
      _count: {
        select: {
          novels: true,
          favorites: true,
          comments: true
        }
      }
    }
  })
}
