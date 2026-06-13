<template>
  <div
    :class="[
      'fixed top-16 right-0 h-[calc(100vh-4rem)] w-full max-w-md glass border-l border-white/10 z-40 flex flex-col transition-transform duration-300',
      isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
    ]"
  >
    <div class="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
      <h3 class="font-bold flex items-center gap-2">
        <Icon name="ph:chat-centered-dots" class="text-neuro-primary" />
        批注面板
        <span class="text-sm font-normal text-white/50">({{ annotations.length }})</span>
      </h3>
      <button
        @click="handleClose"
        class="p-1.5 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white"
      >
        <Icon name="ph:x" class="text-xl" />
      </button>
    </div>

    <div class="flex items-center gap-2 px-4 py-2 border-b border-white/10 overflow-x-auto">
      <button
        v-for="f in filters"
        :key="f.value"
        @click="setFilter(f.value)"
        :class="[
          'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition font-medium',
          filter === f.value
            ? 'bg-neuro-primary text-white'
            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
        ]"
      >
        {{ f.label }}
        <span v-if="f.count !== undefined" class="ml-1 opacity-70">({{ f.count }})</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="!activeAnnotation && filteredAnnotations.length" class="divide-y divide-white/5">
        <div
          v-for="ann in filteredAnnotations"
          :key="ann.id"
          @click="handleSelectAnnotation(ann.id)"
          :class="[
            'p-4 cursor-pointer transition hover:bg-white/5',
            ann.id === activeAnnotationId ? 'bg-white/5' : ''
          ]"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <img
                :src="ann.user.avatar || defaultAvatar(ann.user.username)"
                :alt="ann.user.username"
                class="w-7 h-7 rounded-full flex-shrink-0"
              />
              <span class="text-sm font-medium truncate">{{ ann.user.username }}</span>
            </div>
            <span
              :class="[
                'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                ann.status === 'PENDING'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              ]"
            >
              {{ ann.status === 'PENDING' ? '待处理' : '已解决' }}
            </span>
          </div>
          <p class="text-sm text-white/80 line-clamp-2 mb-2">{{ ann.content }}</p>
          <div class="p-2 bg-white/5 rounded-lg text-xs text-white/50 mb-2 line-clamp-1">
            <Icon name="ph:quote" class="inline mr-0.5 opacity-60" />
            {{ ann.anchorText }}
          </div>
          <div class="flex items-center justify-between text-xs text-white/40">
            <span>{{ formatDate(ann.createdAt) }}</span>
            <span class="flex items-center gap-1">
              <Icon name="ph:chat-circle" />
              {{ ann._count?.replies || ann.replies?.length || 0 }}
            </span>
          </div>
        </div>
      </div>

      <div v-else-if="!activeAnnotation && !filteredAnnotations.length" class="p-8 text-center text-white/40">
        <Icon name="ph:note-pencil" class="text-4xl mb-3 opacity-50" />
        <p>暂无{{ filter === 'ALL' ? '' : filter === 'PENDING' ? '待处理' : '已解决' }}批注</p>
      </div>

      <div v-else-if="activeAnnotation" class="h-full flex flex-col">
        <div class="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <button
            @click="handleBack"
            class="p-1 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white"
          >
            <Icon name="ph:caret-left" />
          </button>
          <span class="text-sm text-white/70">批注详情</span>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div class="glass rounded-xl p-4">
            <div class="flex items-start justify-between gap-2 mb-3">
              <div class="flex items-center gap-2 min-w-0">
                <img
                  :src="activeAnnotation.user.avatar || defaultAvatar(activeAnnotation.user.username)"
                  :alt="activeAnnotation.user.username"
                  class="w-8 h-8 rounded-full flex-shrink-0"
                />
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ activeAnnotation.user.username }}</div>
                  <div class="text-xs text-white/40">{{ formatDate(activeAnnotation.createdAt) }}</div>
                </div>
              </div>
              <button
                @click="handleToggleStatus"
                :disabled="statusLoading"
                :class="[
                  'px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1',
                  activeAnnotation.status === 'PENDING'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30',
                  statusLoading ? 'opacity-50 cursor-not-allowed' : ''
                ]"
              >
                <Icon :name="statusLoading ? 'ph:spinner-gap' : (activeAnnotation.status === 'PENDING' ? 'ph:check-circle' : 'ph:arrow-counter-clockwise')" :class="statusLoading ? 'animate-spin' : ''" />
                {{ activeAnnotation.status === 'PENDING' ? '标记已解决' : '重新打开' }}
              </button>
            </div>

            <div :class="[
              'p-3 rounded-lg mb-3 border-l-4',
              activeAnnotation.status === 'PENDING'
                ? 'bg-neuro-primary/10 border-neuro-primary'
                : 'bg-white/5 border-white/20'
            ]">
              <p class="text-sm text-white/90 whitespace-pre-wrap">{{ activeAnnotation.content }}</p>
            </div>

            <div class="p-3 bg-white/5 rounded-lg text-sm text-white/60">
              <div class="text-xs text-white/40 mb-1 flex items-center gap-1">
                <Icon name="ph:link-simple" />
                关联文本
              </div>
              <p class="line-clamp-3">{{ activeAnnotation.anchorText }}</p>
            </div>
          </div>

          <div class="space-y-3">
            <h4 class="text-sm font-medium text-white/70 flex items-center gap-1">
              <Icon name="ph:chat-circle-dots" />
              回复讨论 ({{ activeAnnotation.replies?.length || 0 }})
            </h4>

            <div v-if="activeAnnotation.replies?.length" class="space-y-3">
              <div
                v-for="reply in activeAnnotation.replies"
                :key="reply.id"
                class="flex gap-3"
              >
                <img
                  :src="reply.user.avatar || defaultAvatar(reply.user.username)"
                  :alt="reply.user.username"
                  class="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
                />
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium">{{ reply.user.username }}</span>
                    <span class="text-xs text-white/40">{{ formatDate(reply.createdAt) }}</span>
                  </div>
                  <div class="p-3 bg-white/5 rounded-xl text-sm text-white/80 whitespace-pre-wrap">
                    {{ reply.content }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="p-6 text-center text-white/40 text-sm glass rounded-xl">
              <Icon name="ph:chat-circle" class="text-3xl mb-2 opacity-50" />
              暂无回复，来发起讨论吧
            </div>
          </div>
        </div>

        <div class="border-t border-white/10 p-4 bg-white/5">
          <div class="flex gap-2">
            <textarea
              v-model="replyContent"
              rows="2"
              placeholder="输入回复内容..."
              class="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-neuro-primary/50 resize-none"
              @keydown.ctrl.enter="handleSubmitReply"
              @keydown.meta.enter="handleSubmitReply"
            />
            <Button
              @click="handleSubmitReply"
              :loading="replyLoading"
              variant="primary"
              size="sm"
              :disabled="!replyContent.trim()"
              class="self-end"
            >
              <Icon name="ph:paper-plane-right" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Annotation, AnnotationFilter } from '~/composables/useAnnotations'

const props = defineProps<{
  isOpen: boolean
  annotations: Annotation[]
  activeAnnotation: Annotation | null
  activeAnnotationId: number | null
  filter: AnnotationFilter
  filteredAnnotations: Annotation[]
  pendingCount: number
  resolvedCount: number
}>()

const emit = defineEmits<{
  close: []
  select: [id: number]
  back: []
  setFilter: [filter: AnnotationFilter]
  toggleStatus: [id: number, status: 'PENDING' | 'RESOLVED']
  createReply: [id: number, content: string]
}>()

const replyContent = ref('')
const replyLoading = ref(false)
const statusLoading = ref(false)

const filters = computed(() => [
  { value: 'ALL' as AnnotationFilter, label: '全部', count: props.annotations.length },
  { value: 'PENDING' as AnnotationFilter, label: '待处理', count: props.pendingCount },
  { value: 'RESOLVED' as AnnotationFilter, label: '已解决', count: props.resolvedCount }
])

const defaultAvatar = (username: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleClose = () => emit('close')
const handleSelectAnnotation = (id: number) => emit('select', id)
const handleBack = () => emit('back')
const setFilter = (f: AnnotationFilter) => emit('setFilter', f)

const handleToggleStatus = async () => {
  if (!props.activeAnnotation || statusLoading.value) return
  statusLoading.value = true
  try {
    const newStatus = props.activeAnnotation.status === 'PENDING' ? 'RESOLVED' : 'PENDING'
    emit('toggleStatus', props.activeAnnotation.id, newStatus)
  } finally {
    statusLoading.value = false
  }
}

const handleSubmitReply = async () => {
  if (!replyContent.value.trim() || !props.activeAnnotation || replyLoading.value) return
  replyLoading.value = true
  try {
    emit('createReply', props.activeAnnotation.id, replyContent.value.trim())
    replyContent.value = ''
  } finally {
    replyLoading.value = false
  }
}
</script>
