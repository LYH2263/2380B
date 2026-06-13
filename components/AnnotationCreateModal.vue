<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="handleClose"
      >
        <Transition
          enter-active-class="transition duration-200"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div
            v-if="visible"
            class="w-full max-w-lg glass rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          >
            <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 class="text-lg font-bold flex items-center gap-2">
                <Icon name="ph:note-pencil" class="text-neuro-primary" />
                创建批注
              </h3>
              <button
                @click="handleClose"
                class="p-1.5 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white"
              >
                <Icon name="ph:x" class="text-xl" />
              </button>
            </div>

            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">选中的文本</label>
                <div class="p-3 bg-neuro-primary/10 border border-neuro-primary/30 rounded-xl text-sm text-white/90 max-h-24 overflow-y-auto">
                  <Icon name="ph:quote" class="inline mr-1 text-neuro-primary opacity-60" />
                  {{ selectedText }}
                  <Icon name="ph:quote" class="inline ml-1 text-neuro-primary opacity-60" />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">批注内容</label>
                <textarea
                  v-model="content"
                  rows="5"
                  placeholder="请输入您的批注意见或建议..."
                  class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neuro-primary/50 focus:ring-2 focus:ring-neuro-primary/20 transition resize-none"
                  @keydown.ctrl.enter="handleSubmit"
                  @keydown.meta.enter="handleSubmit"
                />
                <div class="flex justify-between mt-2 text-xs text-white/40">
                  <span>Ctrl + Enter 快捷提交</span>
                  <span>{{ content.length }} / 2000</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
              <button
                @click="handleClose"
                class="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition font-medium"
              >
                取消
              </button>
              <Button
                @click="handleSubmit"
                :loading="loading"
                variant="primary"
                :disabled="!content.trim()"
              >
                <Icon name="ph:check" class="mr-1" />
                提交批注
              </Button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  selectedText: string
}>()

const emit = defineEmits<{
  close: []
  submit: [content: string]
}>()

const content = ref('')
const loading = ref(false)

watch(() => props.visible, (val) => {
  if (val) {
    content.value = ''
    nextTick(() => {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement
      textarea?.focus()
    })
  }
})

const handleClose = () => {
  if (loading.value) return
  content.value = ''
  emit('close')
}

const handleSubmit = async () => {
  if (!content.value.trim() || loading.value) return
  loading.value = true
  try {
    emit('submit', content.value.trim())
  } finally {
    loading.value = false
  }
}
</script>
