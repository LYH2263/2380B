<template>
  <div class="min-h-screen">
    <div v-if="pending" class="container mx-auto px-4 py-8">
      <div class="animate-pulse space-y-4">
        <div class="h-8 bg-white/10 rounded w-1/3" />
        <div class="h-4 bg-white/10 rounded w-full" />
        <div class="h-4 bg-white/10 rounded w-full" />
        <div class="h-4 bg-white/10 rounded w-2/3" />
      </div>
    </div>

    <div v-else-if="chapter" class="relative">
      <div
        class="sticky top-16 z-30 glass border-b border-white/10 px-4 py-3 transition-all"
        :class="annotationsStore.isPanelOpen && annotationsStore.hasPermission ? 'pr-[28rem]' : ''"
      >
        <div class="flex items-center justify-between">
          <NuxtLink
            :to="`/novels/${novelId}`"
            class="flex items-center gap-2 text-white/70 hover:text-white transition"
          >
            <Icon name="ph:caret-left" />
            <span class="hidden md:inline">{{ chapter.novel?.title }}</span>
          </NuxtLink>

          <h1 class="font-bold truncate max-w-md">
            {{ chapter.title }}
          </h1>

          <div class="flex items-center gap-2">
            <button
              v-if="annotationsStore.hasPermission"
              @click="togglePanel"
              class="relative p-2 rounded-xl hover:bg-white/10 transition"
              :class="annotationsStore.isPanelOpen ? 'bg-neuro-primary/20 text-neuro-primary' : 'text-white/70'"
            >
              <Icon name="ph:chat-centered-dots" class="text-lg" />
              <span
                v-if="annotationsStore.pendingCount > 0"
                class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {{ annotationsStore.pendingCount > 9 ? '9+' : annotationsStore.pendingCount }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <article
        ref="contentRef"
        class="px-4 md:px-8 py-8 transition-all max-w-4xl mx-auto"
        :class="annotationsStore.isPanelOpen && annotationsStore.hasPermission ? 'pr-[28rem] md:pr-8' : ''"
        @mouseup="handleMouseUp"
        @mousedown="handleMouseDown"
      >
        <div class="prose-novel" v-html="renderedContent"></div>
      </article>

      <div
        ref="createToolbarRef"
        v-if="showCreateToolbar"
        :style="toolbarPosition"
        class="fixed z-50 animate-in fade-in slide-in-from-y-2 duration-150"
      >
        <div class="glass rounded-xl shadow-2xl border border-white/10 p-1 flex items-center gap-1">
          <button
            @click="openCreateModal"
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neuro-primary hover:bg-neuro-primary/90 text-white text-sm font-medium transition"
          >
            <Icon name="ph:note-pencil" />
            添加批注
          </button>
          <div class="w-px h-6 bg-white/10 mx-1" />
          <button
            @click="cancelSelection"
            class="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition"
            title="取消选择"
          >
            <Icon name="ph:x" />
          </button>
        </div>
      </div>

      <Transition
        enter-active-class="transition duration-150"
        enter-from-class="opacity-0 scale-95 -translate-y-2"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-100"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95 -translate-y-2"
      >
        <div
          v-if="hoveredAnnotation"
          :style="tooltipPosition"
          class="fixed z-50 max-w-xs w-80 animate-in"
          @mouseenter="tooltipHovered = true"
          @mouseleave="handleTooltipMouseLeave"
        >
          <div class="glass rounded-xl shadow-2xl border border-white/10 overflow-hidden">
            <div class="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <img
                :src="hoveredAnnotation.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(hoveredAnnotation.user.username)}`"
                :alt="hoveredAnnotation.user.username"
                class="w-6 h-6 rounded-full flex-shrink-0"
              />
              <span class="text-sm font-medium flex-1 truncate">{{ hoveredAnnotation.user.username }}</span>
              <span
                :class="[
                  'px-2 py-0.5 rounded-full text-[10px] font-medium',
                  hoveredAnnotation.status === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                ]"
              >
                {{ hoveredAnnotation.status === 'PENDING' ? '待处理' : '已解决' }}
              </span>
            </div>
            <div class="px-4 py-3">
              <p class="text-sm text-white/85 line-clamp-4 mb-2">{{ hoveredAnnotation.content }}</p>
              <div class="flex items-center justify-between text-xs text-white/40">
                <span>{{ formatDate(hoveredAnnotation.createdAt) }}</span>
                <span v-if="hoveredAnnotation._count?.replies || hoveredAnnotation.replies?.length" class="flex items-center gap-1">
                  <Icon name="ph:chat-circle" />
                  {{ hoveredAnnotation._count?.replies || hoveredAnnotation.replies?.length }} 回复
                </span>
              </div>
            </div>
            <div class="px-4 py-2 border-t border-white/10 bg-white/5">
              <button
                @click="selectAnnotationFromTooltip"
                class="w-full py-1.5 rounded-lg bg-neuro-primary/20 text-neuro-primary hover:bg-neuro-primary/30 text-xs font-medium transition"
              >
                查看详情
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <div class="sticky bottom-0 glass border-t border-white/10 px-4 py-4 z-20 transition-all" :class="annotationsStore.isPanelOpen && annotationsStore.hasPermission ? 'pr-[28rem]' : ''">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <NuxtLink
            v-if="chapter.prevChapter"
            :to="`/novels/${novelId}/chapters/${chapter.prevChapter.id}`"
            class="btn-secondary"
          >
            <Icon name="ph:caret-left" class="mr-1" />
            上一章
          </NuxtLink>
          <div v-else />

          <NuxtLink
            :to="`/novels/${novelId}`"
            class="btn-secondary"
          >
            <Icon name="ph:list" class="mr-1" />
            目录
          </NuxtLink>

          <NuxtLink
            v-if="chapter.nextChapter"
            :to="`/novels/${novelId}/chapters/${chapter.nextChapter.id}`"
            class="btn-secondary"
            @click="handleChapterComplete"
          >
            下一章
            <Icon name="ph:caret-right" class="ml-1" />
          </NuxtLink>
          <div v-else />
        </div>
      </div>

      <div class="px-4 py-8 transition-all max-w-4xl mx-auto" :class="annotationsStore.isPanelOpen && annotationsStore.hasPermission ? 'pr-[28rem] md:pr-8' : ''">
        <div class="card p-6">
          <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
            <Icon name="ph:chat-circle-text" />
            章节评论
          </h3>

          <div v-if="user" class="mb-6">
            <FormTextarea
              v-model="chapterComment"
              placeholder="分享你对这一章的看法..."
              :rows="3"
            />
            <Button
              @click="submitChapterComment"
              :loading="chapterCommentLoading"
              variant="primary"
              class="mt-2"
            >
              发表评论
            </Button>
          </div>
          <div v-else class="mb-6 p-4 glass rounded-xl text-center">
            <NuxtLink to="/auth/login" class="text-neuro-primary hover:underline">登录</NuxtLink>
            后可以发表评论
          </div>

          <div v-if="chapter.comments?.length" class="space-y-4">
            <div
              v-for="comment in chapter.comments"
              :key="comment.id"
              class="p-4 glass rounded-xl"
            >
              <div class="flex items-start gap-3">
                <NuxtLink
                  :to="`/user/${comment.user.username}`"
                  class="flex-shrink-0 hover:opacity-80 transition"
                >
                  <img
                    :src="comment.user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                    :alt="comment.user.username"
                    class="w-10 h-10 rounded-full"
                  />
                </NuxtLink>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <NuxtLink
                      :to="`/user/${comment.user.username}`"
                      class="font-medium hover:text-neuro-primary transition"
                    >
                      {{ comment.user.username }}
                    </NuxtLink>
                    <span class="text-xs text-white/50">{{ formatDate(comment.createdAt) }}</span>
                  </div>
                  <p class="text-white/80">{{ comment.content }}</p>

                  <div v-if="comment.replies?.length" class="mt-3 space-y-2 pl-4 border-l-2 border-white/10">
                    <div
                      v-for="reply in comment.replies"
                      :key="reply.id"
                      class="flex items-start gap-2"
                    >
                      <NuxtLink
                        :to="`/user/${reply.user.username}`"
                        class="flex-shrink-0 hover:opacity-80 transition"
                      >
                        <img
                          :src="reply.user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                          :alt="reply.user.username"
                          class="w-6 h-6 rounded-full"
                        />
                      </NuxtLink>
                      <div>
                        <NuxtLink
                          :to="`/user/${reply.user.username}`"
                          class="font-medium text-sm hover:text-neuro-primary transition"
                        >
                          {{ reply.user.username }}
                        </NuxtLink>
                        <p class="text-sm text-white/70">{{ reply.content }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-white/50">
            暂无评论，来发表第一条评论吧！
          </div>
        </div>
      </div>
    </div>

    <div v-else class="container mx-auto px-4 py-20 text-center">
      <Icon name="ph:warning" class="text-6xl text-white/30 mb-4" />
      <p class="text-xl text-white/50">章节不存在</p>
      <NuxtLink to="/novels" class="btn-primary mt-4 inline-block">
        返回小说库
      </NuxtLink>
    </div>

    <AnnotationCreateModal
      :visible="showCreateModal"
      :selected-text="annotationsStore.selectedText?.text || ''"
      @close="closeCreateModal"
      @submit="handleCreateAnnotation"
    />

    <AnnotationPanel
      :is-open="annotationsStore.isPanelOpen"
      :annotations="annotationsStore.annotations"
      :active-annotation="annotationsStore.activeAnnotation"
      :active-annotation-id="annotationsStore.activeAnnotationId"
      :filter="annotationsStore.filter"
      :filtered-annotations="annotationsStore.filteredAnnotations"
      :pending-count="annotationsStore.pendingCount"
      :resolved-count="annotationsStore.resolvedCount"
      @close="annotationsStore.closePanel()"
      @select="(id) => annotationsStore.setActiveAnnotation(id)"
      @back="annotationsStore.setActiveAnnotation(null)"
      @set-filter="(f) => annotationsStore.setFilter(f)"
      @toggle-status="handleToggleStatus"
      @create-reply="handleCreateReply"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { user } = useAuth()
const toast = useToast()
const { trackEvent, startReadingSession } = useAnalytics()
const annotationsStore = useAnnotations()

const novelId = computed(() => Number(route.params.id))
const chapterId = computed(() => Number(route.params.chapterId))

const contentRef = ref<HTMLElement | null>(null)
const createToolbarRef = ref<HTMLElement | null>(null)

let readingSession: ReturnType<typeof startReadingSession> | null = null
let heartbeatInterval: ReturnType<typeof setInterval> | null = null

const { data: chapter, pending, refresh } = await useFetch(
  () => `/api/novels/${novelId.value}/chapters/${chapterId.value}`
)

const chapterComment = ref('')
const chapterCommentLoading = ref(false)

const showCreateToolbar = ref(false)
const showCreateModal = ref(false)
const toolbarPosition = ref({ top: '0px', left: '0px' })
const tooltipPosition = ref({ top: '0px', left: '0px' })
const tooltipHovered = ref(false)
let mouseDownTarget: EventTarget | null = null

watchEffect(() => {
  if (chapter.value && chapterId.value) {
    annotationsStore.loadAnnotations(chapterId.value)
  }
})

const hoveredAnnotation = computed(() => {
  if (annotationsStore.hoveredAnnotationId.value === null) return null
  return annotationsStore.annotations.value.find(a => a.id === annotationsStore.hoveredAnnotationId.value) || null
})

const paragraphs = computed(() => {
  if (!chapter.value?.content) return []
  return chapter.value.content
    .split('\n')
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0)
})

const paragraphOffsets = computed(() => {
  const offsets: number[] = []
  let offset = 0
  if (!chapter.value?.content) return offsets
  const lines = chapter.value.content.split('\n')
  for (const line of lines) {
    offsets.push(offset)
    offset += line.length + 1
  }
  return offsets
})

const escapeHtml = (text: string) => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

const targetOffset = computed(() => {
  const hash = route.hash
  if (!hash || !hash.startsWith('#offset=')) return null
  const offset = Number(hash.replace('#offset=', ''))
  return isNaN(offset) ? null : offset
})

const renderedContent = computed(() => {
  if (!chapter.value?.content) return ''

  const content = chapter.value.content
  const lines = content.split('\n')
  const annots = annotationsStore.filteredAnnotations.value

  const globalOffset = 0
  let currentOffset = globalOffset

  let html = ''
  const tOffset = targetOffset.value
  let targetHighlighted = false

  lines.forEach((line, lineIdx) => {
    if (line.trim().length === 0) {
      currentOffset += line.length + 1
      return
    }

    const lineStartOffset = currentOffset
    const lineEndOffset = currentOffset + line.length

    const lineAnnotations = annots.filter(a => {
      return a.startOffset < lineEndOffset && a.endOffset > lineStartOffset
    })

    let targetStart = -1
    let targetEnd = -1
    if (tOffset !== null && !targetHighlighted) {
      if (tOffset >= lineStartOffset && tOffset < lineEndOffset) {
        targetStart = tOffset - lineStartOffset
        targetEnd = Math.min(targetStart + 20, line.length)
        targetHighlighted = true
      }
    }

    const segments: Array<{
      start: number
      end: number
      annotations: typeof annots
      isTarget: boolean
    }> = []

    const splitPoints = new Set<number>()
    splitPoints.add(0)
    splitPoints.add(line.length)

    lineAnnotations.forEach(a => {
      const relStart = Math.max(0, a.startOffset - lineStartOffset)
      const relEnd = Math.min(line.length, a.endOffset - lineStartOffset)
      splitPoints.add(relStart)
      splitPoints.add(relEnd)
    })

    if (targetStart >= 0) {
      splitPoints.add(targetStart)
      splitPoints.add(targetEnd)
    }

    const points = Array.from(splitPoints).sort((a, b) => a - b)

    for (let i = 0; i < points.length - 1; i++) {
      const segStart = points[i]
      const segEnd = points[i + 1]
      if (segStart >= segEnd) continue

      const segAnnotations = lineAnnotations.filter(a => {
        const relStart = Math.max(0, a.startOffset - lineStartOffset)
        const relEnd = Math.min(line.length, a.endOffset - lineStartOffset)
        return segStart >= relStart && segEnd <= relEnd
      })

      const isTarget = targetStart >= 0 && segStart >= targetStart && segEnd <= targetEnd

      segments.push({
        start: segStart,
        end: segEnd,
        annotations: segAnnotations,
        isTarget
      })
    }

    const lineHasTarget = targetStart >= 0
    const targetAttr = lineHasTarget ? ` id="search-target" data-search-target="true"` : ''

    html += `<div class="relative group" data-line-index="${lineIdx}" data-line-start="${lineStartOffset}"${targetAttr}><p class="mb-4 indent-8 leading-relaxed">`

    segments.forEach(seg => {
      const segText = line.substring(seg.start, seg.end)
      const escaped = escapeHtml(segText)

      if (seg.isTarget) {
        html += `<span class="search-match-highlight">${escaped}</span>`
      } else if (seg.annotations.length === 0) {
        html += escaped
      } else {
        const sortedAnns = [...seg.annotations].sort((a, b) => b.id - a.id)
        const isResolved = sortedAnns.every(a => a.status === 'RESOLVED')
        const isActive = sortedAnns.some(a => a.id === annotationsStore.activeAnnotationId.value)
        const isHovered = sortedAnns.some(a => a.id === annotationsStore.hoveredAnnotationId.value)

        const classes = [
          'annotation-highlight',
          'cursor-pointer',
          'transition-all',
          'duration-200',
          'rounded-sm',
          'relative',
          isResolved
            ? 'bg-white/10 text-white/60'
            : 'bg-neuro-primary/30 border-b-2 border-neuro-primary',
          isActive ? 'ring-2 ring-neuro-primary/60 bg-neuro-primary/40' : '',
          isHovered ? 'bg-neuro-primary/50' : ''
        ]

        const annIds = sortedAnns.map(a => a.id).join(',')

        html += `<span class="${classes.join(' ')}" data-annotation-ids="${annIds}">${escaped}</span>`
      }
    })

    html += '</p></div>'
    currentOffset += line.length + 1
  })

  return html
})

const scrollToSearchTarget = () => {
  if (!process.client) return
  if (targetOffset.value === null) return

  nextTick(() => {
    setTimeout(() => {
      const target = document.getElementById('search-target')
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target.classList.add('animate-pulse')
        setTimeout(() => {
          target.classList.remove('animate-pulse')
        }, 3000)
      }
    }, 300)
  })
}

const handleMouseDown = (e: MouseEvent) => {
  mouseDownTarget = e.target
  tooltipHovered.value = false
  annotationsStore.hoveredAnnotationId.value = null
}

const handleMouseUp = async (e: MouseEvent) => {
  if (!annotationsStore.hasPermission.value) return

  const target = e.target as HTMLElement
  const annotationSpan = target.closest('[data-annotation-ids]') as HTMLElement

  if (annotationSpan) {
    const idsStr = annotationSpan.getAttribute('data-annotation-ids')
    if (idsStr) {
      const ids = idsStr.split(',').map(Number)
      annotationsStore.hoveredAnnotationId.value = ids[0]
      const rect = annotationSpan.getBoundingClientRect()
      const tooltipWidth = 320
      let left = rect.left + rect.width / 2 - tooltipWidth / 2
      if (left < 16) left = 16
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = window.innerWidth - tooltipWidth - 16
      }
      const top = rect.top > 300 ? rect.top - 20 : rect.bottom + 16
      tooltipPosition.value = {
        top: `${top}px`,
        left: `${left}px`
      }
      return
    }
  }

  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    showCreateToolbar.value = false
    return
  }

  const range = selection.getRangeAt(0)
  if (!contentRef.value?.contains(range.commonAncestorContainer)) {
    showCreateToolbar.value = false
    return
  }

  const selectedText = selection.toString().trim()
  if (selectedText.length === 0) {
    showCreateToolbar.value = false
    return
  }

  if (selectedText.length < 1) {
    showCreateToolbar.value = false
    return
  }

  const preRange = document.createRange()
  preRange.selectNodeContents(contentRef.value)
  preRange.setEnd(range.startContainer, range.startOffset)
  const startOffset = preRange.toString().length

  const endOffset = startOffset + selection.toString().length

  annotationsStore.setSelectedText(selectedText, startOffset, endOffset)

  await nextTick()

  const rect = range.getBoundingClientRect()
  const toolbarWidth = 200
  let left = rect.left + rect.width / 2 - toolbarWidth / 2
  if (left < 16) left = 16
  if (left + toolbarWidth > window.innerWidth - 16) {
    left = window.innerWidth - toolbarWidth - 16
  }
  const top = rect.top > 80 ? rect.top - 60 : rect.bottom + 12
  toolbarPosition.value = {
    top: `${top}px`,
    left: `${left}px`
  }
  showCreateToolbar.value = true
}

const cancelSelection = () => {
  showCreateToolbar.value = false
  annotationsStore.clearSelectedText()
  window.getSelection()?.removeAllRanges()
}

const openCreateModal = () => {
  showCreateModal.value = true
  showCreateToolbar.value = false
}

const closeCreateModal = () => {
  showCreateModal.value = false
  annotationsStore.clearSelectedText()
  window.getSelection()?.removeAllRanges()
}

const handleCreateAnnotation = async (content: string) => {
  if (!annotationsStore.selectedText.value) return

  try {
    await annotationsStore.createAnnotation(chapterId.value, {
      content,
      startOffset: annotationsStore.selectedText.value.startOffset,
      endOffset: annotationsStore.selectedText.value.endOffset,
      anchorText: annotationsStore.selectedText.value.text
    })
    showCreateModal.value = false
    window.getSelection()?.removeAllRanges()
    toast.success('批注创建成功')
  } catch (e: any) {
    toast.error(e.message || '批注创建失败')
  }
}

const selectAnnotationFromTooltip = () => {
  if (annotationsStore.hoveredAnnotationId.value !== null) {
    annotationsStore.setActiveAnnotation(annotationsStore.hoveredAnnotationId.value)
    annotationsStore.hoveredAnnotationId.value = null
    tooltipHovered.value = false
  }
}

const handleTooltipMouseLeave = () => {
  tooltipHovered.value = false
  annotationsStore.hoveredAnnotationId.value = null
}

const handleToggleStatus = async (id: number, status: 'PENDING' | 'RESOLVED') => {
  try {
    await annotationsStore.updateStatus(id, status)
    toast.success(status === 'RESOLVED' ? '已标记为已解决' : '已重新打开')
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

const handleCreateReply = async (id: number, content: string) => {
  try {
    await annotationsStore.createReply(id, content)
    toast.success('回复成功')
  } catch (e: any) {
    toast.error(e.message || '回复失败')
  }
}

const togglePanel = () => {
  if (annotationsStore.isPanelOpen.value) {
    annotationsStore.closePanel()
  } else {
    annotationsStore.openPanel()
  }
}

const initReadingTracking = () => {
  if (!process.client || !chapter.value) return

  trackEvent('CHAPTER_START', {
    novelId: novelId.value,
    chapterId: chapterId.value
  })

  readingSession = startReadingSession(
    novelId.value,
    chapterId.value,
    paragraphs.value.length
  )

  heartbeatInterval = setInterval(() => {
    readingSession?.heartbeat()
  }, 30000)
}

const handleScroll = () => {
  if (!readingSession || !paragraphs.value.length) return

  const paragraphElements = document.querySelectorAll('.prose-novel > div')
  let visibleParagraph = 0

  paragraphElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight / 2) {
      visibleParagraph = index
    }
  })

  readingSession.updateProgress(visibleParagraph)
}

const handleBeforeUnload = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
  }
  readingSession?.endSession(false)
}

const handleChapterComplete = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
  }
  readingSession?.endSession(true)
  trackEvent('CHAPTER_COMPLETE', {
    novelId: novelId.value,
    chapterId: chapterId.value
  })
}

watch(() => chapter.value, (newVal) => {
  if (newVal && !pending.value) {
    nextTick(() => {
      initReadingTracking()
      scrollToSearchTarget()
    })
  }
}, { immediate: true })

if (process.client) {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('click', (e) => {
    if (showCreateToolbar.value && !createToolbarRef.value?.contains(e.target as Node)) {
      if (!contentRef.value?.contains(e.target as Node)) {
        showCreateToolbar.value = false
      }
    }
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
    readingSession?.endSession(false)
    annotationsStore.reset()
  })
}

const submitChapterComment = async () => {
  if (!chapterComment.value.trim()) return

  chapterCommentLoading.value = true
  try {
    await $fetch(`/api/chapters/${chapterId.value}/comments`, {
      method: 'POST',
      body: {
        content: chapterComment.value
      }
    })
    chapterComment.value = ''
    await refresh()
    toast.success('评论成功')
  } catch (e: any) {
    toast.error(e.message || '评论失败')
  } finally {
    chapterCommentLoading.value = false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

useHead({
  title: computed(() => chapter.value ? `${chapter.value.title} - ${chapter.value.novel?.title}` : '加载中...')
})
</script>

<style scoped>
.annotation-highlight {
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.search-match-highlight {
  background: linear-gradient(120deg, rgba(250, 204, 21, 0.4) 0%, rgba(250, 204, 21, 0.2) 100%);
  border-bottom: 2px solid rgba(250, 204, 21, 0.8);
  border-radius: 3px;
  padding: 0 2px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  animation: search-match-glow 2s ease-in-out infinite;
}

@keyframes search-match-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(250, 204, 21, 0);
  }
  50% {
    box-shadow: 0 0 8px 2px rgba(250, 204, 21, 0.4);
  }
}
</style>
