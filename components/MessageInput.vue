<template>
  <div class="p-4 border-t border-white/10 bg-white/5">
    <div class="flex gap-3 items-end">
      <div class="flex-1 relative">
        <textarea
          v-model="inputValue"
          ref="textareaRef"
          @keydown="handleKeydown"
          @input="autoResize"
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          class="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl 
                 text-white placeholder-white/50 resize-none overflow-hidden
                 focus:outline-none focus:ring-2 focus:ring-neuro-primary/50 focus:border-neuro-primary 
                 transition-all duration-300"
          :rows="1"
          :disabled="loading"
        />
        <button
          type="button"
          @click="handleSend"
          :disabled="!inputValue.trim() || loading"
          class="absolute right-2 bottom-2 p-2 rounded-lg bg-gradient-to-r from-neuro-primary to-neuro-secondary 
                 text-white disabled:opacity-50 disabled:cursor-not-allowed
                 hover:shadow-lg hover:shadow-neuro-primary/30 transition-all"
        >
          <Icon v-if="!loading" name="ph:paper-plane-right-fill" />
          <Icon v-else name="ph:spinner" class="animate-spin" />
        </button>
      </div>
    </div>
    <p class="text-xs text-white/40 mt-2 text-center">
      Enter 发送 · Shift+Enter 换行
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
}>()

const inputValue = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const autoResize = () => {
  const textarea = textareaRef.value
  if (!textarea) return

  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

const handleSend = () => {
  const content = inputValue.value.trim()
  if (!content || props.loading) return

  emit('send', content)
  inputValue.value = ''
  
  const textarea = textareaRef.value
  if (textarea) {
    textarea.style.height = 'auto'
  }
}

const focus = () => {
  textareaRef.value?.focus()
}

defineExpose({ focus })
</script>
