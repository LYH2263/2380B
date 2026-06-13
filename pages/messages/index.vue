<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <div class="card overflow-hidden">
          <div class="p-6 border-b border-white/10">
            <h1 class="text-2xl font-bold flex items-center gap-3">
              <Icon name="ph:chat-circle-text-fill" class="text-neuro-primary" />
              私信
            </h1>
          </div>

          <div v-if="loadingConversations" class="p-6 space-y-4">
            <div v-for="i in 5" :key="i" class="flex gap-4">
              <div class="w-12 h-12 rounded-full skeleton" />
              <div class="flex-1 space-y-2">
                <div class="h-4 skeleton w-1/3" />
                <div class="h-3 skeleton w-2/3" />
              </div>
            </div>
          </div>

          <div v-else-if="conversations.length === 0" class="p-12 text-center">
            <Icon name="ph:chat-circle-text" class="text-6xl text-white/20 mb-4 mx-auto" />
            <p class="text-white/50 mb-2">暂无私信</p>
            <p class="text-sm text-white/30">去用户主页和其他读者打招呼吧~</p>
          </div>

          <div v-else>
            <ConversationItem
              v-for="conv in conversations"
              :key="conv.id"
              :conversation="conv"
              :format-conversation-time="formatConversationTime"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessages } from '~/composables/useMessages'

definePageMeta({
  middleware: 'auth'
})

const {
  conversations,
  loadingConversations,
  fetchConversations,
  fetchTotalUnread,
  formatConversationTime
} = useMessages()

await fetchConversations()
await fetchTotalUnread()

useHead({
  title: '私信 - Neurosama 粉丝小说站'
})
</script>
