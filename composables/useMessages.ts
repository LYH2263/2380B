import type { Ref } from 'vue'

export interface User {
  id: number
  username: string
  avatar: string | null
}

export interface Message {
  id: number
  conversationId: number
  senderId: number
  content: string
  readByReceiver: boolean
  createdAt: string
  sender: User
}

export interface Conversation {
  id: number
  otherUser: User
  lastMessage?: {
    id: number
    content: string
    createdAt: string
    senderId: number
    readByReceiver: boolean
  } | null
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
}

export interface MessagesResponse {
  messages: Message[]
  totalCount: number
  hasMore: boolean
  currentPage: number
  limit: number
}

export const useMessages = () => {
  const { user } = useAuth()
  const toast = useToast()

  const conversations = ref<Conversation[]>([])
  const totalUnread = ref(0)
  const loadingConversations = ref(false)
  const loadingMessages = ref(false)
  const sendingMessage = ref(false)

  const messagesCache = ref<Record<number, Message[]>>({})
  const hasMoreCache = ref<Record<number, boolean>>({})
  const pageCache = ref<Record<number, number>>({})

  const fetchConversations = async () => {
    if (!user.value) return

    loadingConversations.value = true
    try {
      const { data } = await useFetch('/api/conversations')
      if (data.value?.success) {
        conversations.value = data.value.conversations
      }
    } catch (e: any) {
      toast.error(e.message || '获取会话列表失败')
    } finally {
      loadingConversations.value = false
    }
  }

  const fetchTotalUnread = async () => {
    if (!user.value) {
      totalUnread.value = 0
      return
    }

    try {
      const { data } = await useFetch('/api/messages/unread-count')
      if (data.value?.success) {
        totalUnread.value = data.value.totalUnread
      }
    } catch (e) {
      console.error('获取未读数失败', e)
    }
  }

  const fetchMessages = async (conversationId: number, page: number = 1, append: boolean = false): Promise<MessagesResponse | null> => {
    if (!user.value) return null

    loadingMessages.value = true
    try {
      const { data } = await useFetch(`/api/conversations/${conversationId}/messages`, {
        query: { page, limit: 30 }
      })

      if (data.value?.success) {
        const result = data.value as MessagesResponse

        if (!messagesCache.value[conversationId] || !append) {
          messagesCache.value[conversationId] = result.messages
        } else {
          messagesCache.value[conversationId] = [...result.messages, ...messagesCache.value[conversationId]]
        }

        hasMoreCache.value[conversationId] = result.hasMore
        pageCache.value[conversationId] = result.currentPage

        return result
      }
      return null
    } catch (e: any) {
      toast.error(e.message || '获取消息失败')
      return null
    } finally {
      loadingMessages.value = false
    }
  }

  const loadMoreMessages = async (conversationId: number): Promise<boolean> => {
    if (!hasMoreCache.value[conversationId]) return false

    const nextPage = (pageCache.value[conversationId] || 1) + 1
    const result = await fetchMessages(conversationId, nextPage, true)

    return result?.hasMore || false
  }

  const getMessages = (conversationId: number): Ref<Message[]> => {
    if (!messagesCache.value[conversationId]) {
      messagesCache.value[conversationId] = []
    }
    return computed(() => messagesCache.value[conversationId] || []) as unknown as Ref<Message[]>
  }

  const sendMessage = async (conversationId: number, content: string): Promise<Message | null> => {
    if (!user.value || !content.trim()) return null

    sendingMessage.value = true
    try {
      const response = await $fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { content: content.trim() }
      })

      if (response.success && response.message) {
        const message = response.message as Message

        if (!messagesCache.value[conversationId]) {
          messagesCache.value[conversationId] = []
        }
        messagesCache.value[conversationId].push(message)

        await fetchConversations()
        await fetchTotalUnread()

        return message
      }
      return null
    } catch (e: any) {
      toast.error(e.data?.message || e.message || '发送消息失败')
      return null
    } finally {
      sendingMessage.value = false
    }
  }

  const markAsRead = async (conversationId: number) => {
    if (!user.value) return

    try {
      await $fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST'
      })

      const conv = conversations.value.find(c => c.id === conversationId)
      if (conv) {
        conv.unreadCount = 0
      }

      await fetchTotalUnread()
    } catch (e: any) {
      console.error('标记已读失败', e)
    }
  }

  const startConversation = async (targetUserId: number): Promise<number | null> => {
    if (!user.value) return null

    try {
      const response = await $fetch('/api/conversations/start', {
        method: 'POST',
        body: { targetUserId }
      })

      if (response.success) {
        await fetchConversations()
        return response.conversationId
      }
      return null
    } catch (e: any) {
      toast.error(e.data?.message || e.message || '创建会话失败')
      return null
    }
  }

  const clearCache = () => {
    messagesCache.value = {}
    hasMoreCache.value = {}
    pageCache.value = {}
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return weekdays[date.getDay()]
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    }
  }

  const formatConversationTime = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return weekdays[date.getDay()]
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    }
  }

  return {
    conversations,
    totalUnread,
    loadingConversations,
    loadingMessages,
    sendingMessage,
    fetchConversations,
    fetchTotalUnread,
    fetchMessages,
    loadMoreMessages,
    getMessages,
    sendMessage,
    markAsRead,
    startConversation,
    clearCache,
    formatMessageTime,
    formatConversationTime,
    hasMoreCache
  }
}
