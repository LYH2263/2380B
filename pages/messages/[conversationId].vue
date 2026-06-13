<template>
  <div class="h-screen flex flex-col">
    <div class="container mx-auto px-4 flex-1 flex flex-col overflow-hidden py-4">
      <div class="max-w-4xl mx-auto w-full card flex-1 flex flex-col overflow-hidden">
        <div class="p-4 border-b border-white/10 flex items-center gap-4 flex-shrink-0">
          <NuxtLink to="/messages" class="p-2 hover:bg-white/10 rounded-lg transition">
            <Icon name="ph:arrow-left" class="text-xl" />
          </NuxtLink>
          <img
            v-if="otherUser"
            :src="otherUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
            :alt="otherUser.username"
            class="w-10 h-10 rounded-full"
          />
          <div>
            <p class="font-semibold">{{ otherUser?.username }}</p>
          </div>
        </div>

        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto p-4"
          @scroll="handleScroll"
        >
          <div v-if="loadingMessages && messages.length === 0" class="flex flex-col gap-3">
            <div v-for="i in 5" :key="i" :class="['flex gap-2', i % 2 === 0 ? 'justify-end' : 'justify-start']">
              <div class="w-8 h-8 rounded-full skeleton flex-shrink-0" />
              <div class="w-32 h-10 rounded-2xl skeleton" />
            </div>
          </div>

          <div v-else>
            <div v-if="hasMore" class="text-center py-4">
              <button
                v-if="!loadingMessages"
                @click="loadMore"
                class="text-sm text-neuro-primary hover:underline"
              >
                加载更多历史消息
              </button>
              <Icon v-else name="ph:spinner" class="animate-spin text-neuro-primary mx-auto" />
            </div>

            <div v-if="messages.length === 0 && !loadingMessages" class="text-center py-12">
              <Icon name="ph:chat-circle-text" class="text-5xl text-white/20 mb-3 mx-auto" />
              <p class="text-white/50">暂无消息</p>
              <p class="text-sm text-white/30">发送第一条消息开始聊天吧~</p>
            </div>

            <MessageBubble
              v-for="(message, index) in messages"
              :key="message.id"
              :message="message"
              :is-own="message.senderId === currentUserId"
              :show-avatar="shouldShowAvatar(index)"
              :format-message-time="formatMessageTime"
            />
          </div>

          <div ref="scrollAnchor" />
        </div>

        <MessageInput
          ref="messageInputRef"
          :loading="sendingMessage"
          @send="handleSend"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessages, type Message, type User } from '~/composables/useMessages'
import { nextTick, onMounted, watch } from 'vue'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const { user } = useAuth()

const conversationId = computed(() => Number(route.params.conversationId))
const currentUserId = computed(() => user.value?.id || 0)

const messagesStore = useMessages()
const {
  conversations,
  sendingMessage,
  loadingMessages,
  hasMoreCache,
  fetchMessages,
  loadMoreMessages,
  sendMessage,
  markAsRead,
  fetchConversations,
  fetchTotalUnread,
  formatMessageTime
} = messagesStore

const messages = computed(() => messagesStore.getMessages(conversationId.value).value)
const otherUser = ref<User | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
const scrollAnchor = ref<HTMLElement | null>(null)
const messageInputRef = ref<InstanceType<typeof MessageInput> | null>(null)
const isAtBottom = ref(true)
const initialLoad = ref(true)

const hasMore = computed(() => hasMoreCache.value[conversationId.value] || false)

const shouldShowAvatar = (index: number) => {
  const current = messages.value[index]
  const prev = messages.value[index - 1]
  
  if (!prev) return true
  
  return prev.senderId !== current.senderId
}

const scrollToBottom = (smooth: boolean = true) => {
  if (scrollAnchor.value) {
    scrollAnchor.value.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }
}

const handleScroll = () => {
  if (!messagesContainer.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  isAtBottom.value = scrollHeight - scrollTop - clientHeight < 100
}

const loadMore = async () => {
  if (!hasMore.value || loadingMessages.value) return
  
  const scrollHeightBefore = messagesContainer.value?.scrollHeight || 0
  await loadMoreMessages(conversationId.value)
  
  await nextTick()
  if (messagesContainer.value) {
    const scrollHeightAfter = messagesContainer.value.scrollHeight
    messagesContainer.value.scrollTop = scrollHeightAfter - scrollHeightBefore
  }
}

const handleSend = async (content: string) => {
  if (!content.trim()) return
  
  const result = await sendMessage(conversationId.value, content)
  if (result) {
    await nextTick()
    scrollToBottom(true)
    messageInputRef.value?.focus()
  }
}

const loadConversationData = async () => {
  initialLoad.value = true
  
  await fetchConversations()
  
  const conversation = conversations.value.find(c => c.id === conversationId.value)
  if (conversation) {
    otherUser.value = conversation.otherUser
  }
  
  await fetchMessages(conversationId.value)
  
  await markAsRead(conversationId.value)
  await fetchTotalUnread()
  
  await nextTick()
  scrollToBottom(false)
  initialLoad.value = false
}

watch(messages, async () => {
  if (isAtBottom.value && !initialLoad.value) {
    await nextTick()
    scrollToBottom(true)
  }
}, { deep: true })

onMounted(async () => {
  await loadConversationData()
  messageInputRef.value?.focus()
})

useHead({
  title: computed(() => otherUser.value ? `与 ${otherUser.value.username} 的私信 - Neurosama 粉丝小说站` : '私信 - Neurosama 粉丝小说站')
})
</script>
