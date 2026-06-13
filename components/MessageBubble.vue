<template>
  <div
    :class="[
      'flex gap-2 mb-3 max-w-[80%]',
      isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'
    ]"
  >
    <img
      v-if="showAvatar"
      :src="message.sender.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
      :alt="message.sender.username"
      class="w-8 h-8 rounded-full flex-shrink-0"
    />
    <div v-else class="w-8 h-8 flex-shrink-0" />

    <div :class="['flex flex-col gap-1', isOwn ? 'items-end' : 'items-start']">
      <div
        :class="[
          'px-4 py-2 rounded-2xl',
          isOwn
            ? 'bg-gradient-to-r from-neuro-primary to-neuro-secondary text-white rounded-br-md'
            : 'bg-white/10 text-white rounded-bl-md'
        ]"
      >
        <p class="whitespace-pre-wrap break-words">{{ message.content }}</p>
      </div>
      <span class="text-xs text-white/40 px-2">
        {{ formatMessageTime(message.createdAt) }}
        <span v-if="isOwn && message.readByReceiver" class="ml-1 text-neuro-accent">
          · 已读
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '~/composables/useMessages'

const props = defineProps<{
  message: Message
  isOwn: boolean
  showAvatar: boolean
  formatMessageTime: (date: string) => string
}>()
</script>
