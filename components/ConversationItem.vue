<template>
  <NuxtLink
    :to="`/messages/${conversation.id}`"
    :class="[
      'flex items-center gap-4 p-4 hover:bg-white/10 transition cursor-pointer border-b border-white/5',
      isActive ? 'bg-white/10' : ''
    ]"
  >
    <div class="relative flex-shrink-0">
      <img
        :src="conversation.otherUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
        :alt="conversation.otherUser.username"
        class="w-12 h-12 rounded-full"
      />
      <div
        v-if="conversation.unreadCount > 0"
        class="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-neuro-primary text-white text-xs font-bold 
               rounded-full flex items-center justify-center border-2 border-slate-900"
      >
        {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
      </div>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between mb-1">
        <span class="font-semibold truncate">{{ conversation.otherUser.username }}</span>
        <span class="text-xs text-white/40 flex-shrink-0 ml-2">
          {{ formatConversationTime(conversation.lastMessageAt) }}
        </span>
      </div>
      <p :class="[
        'text-sm truncate',
        conversation.unreadCount > 0 ? 'text-white font-medium' : 'text-white/50'
      ]">
        {{ conversation.lastMessagePreview || '暂无消息' }}
      </p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Conversation } from '~/composables/useMessages'

defineProps<{
  conversation: Conversation
  isActive?: boolean
  formatConversationTime: (date: string | null) => string
}>()
</script>
