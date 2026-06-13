export interface AnnotationUser {
  id: number
  username: string
  avatar: string | null
}

export interface Annotation {
  id: number
  chapterId: number
  userId: number
  startOffset: number
  endOffset: number
  anchorText: string
  content: string
  status: 'PENDING' | 'RESOLVED'
  resolvedAt: string | null
  resolvedBy: number | null
  createdAt: string
  updatedAt: string
  user: AnnotationUser
  replies?: AnnotationReply[]
  _count?: { replies: number }
}

export interface AnnotationReply {
  id: number
  annotationId: number
  userId: number
  content: string
  createdAt: string
  updatedAt: string
  user: AnnotationUser
}

export type AnnotationFilter = 'ALL' | 'PENDING' | 'RESOLVED'

export const useAnnotations = () => {
  const annotations = ref<Annotation[]>([])
  const activeAnnotationId = ref<number | null>(null)
  const filter = ref<AnnotationFilter>('ALL')
  const hoveredAnnotationId = ref<number | null>(null)
  const isPanelOpen = ref(false)
  const hasPermission = ref(false)
  const loading = ref(false)
  const selectedText = ref<{
    text: string
    startOffset: number
    endOffset: number
  } | null>(null)

  const activeAnnotation = computed(() => {
    if (activeAnnotationId.value === null) return null
    return annotations.value.find(a => a.id === activeAnnotationId.value) || null
  })

  const filteredAnnotations = computed(() => {
    if (filter.value === 'ALL') return annotations.value
    return annotations.value.filter(a => a.status === filter.value)
  })

  const pendingCount = computed(() =>
    annotations.value.filter(a => a.status === 'PENDING').length
  )

  const resolvedCount = computed(() =>
    annotations.value.filter(a => a.status === 'RESOLVED').length
  )

  const loadAnnotations = async (chapterId: number) => {
    loading.value = true
    try {
      const data: any = await $fetch(`/api/chapters/${chapterId}/annotations`)
      annotations.value = data.annotations || []
      hasPermission.value = true
    } catch (e: any) {
      if (e.status === 403) {
        hasPermission.value = false
      }
      annotations.value = []
    } finally {
      loading.value = false
    }
  }

  const createAnnotation = async (
    chapterId: number,
    data: { content: string; startOffset: number; endOffset: number; anchorText: string }
  ) => {
    const result: any = await $fetch(`/api/chapters/${chapterId}/annotations`, {
      method: 'POST',
      body: data
    })
    if (result.annotation) {
      annotations.value.push(result.annotation)
      selectedText.value = null
      activeAnnotationId.value = result.annotation.id
      isPanelOpen.value = true
    }
    return result
  }

  const updateStatus = async (annotationId: number, status: 'PENDING' | 'RESOLVED') => {
    const result: any = await $fetch(`/api/annotations/${annotationId}/status`, {
      method: 'PUT',
      body: { status }
    })
    if (result.annotation) {
      const index = annotations.value.findIndex(a => a.id === annotationId)
      if (index !== -1) {
        annotations.value[index] = { ...annotations.value[index], ...result.annotation }
      }
    }
    return result
  }

  const loadAnnotationDetail = async (annotationId: number) => {
    const result: any = await $fetch(`/api/annotations/${annotationId}`)
    if (result.annotation) {
      const index = annotations.value.findIndex(a => a.id === annotationId)
      if (index !== -1) {
        annotations.value[index] = { ...annotations.value[index], ...result.annotation }
      }
    }
    return result
  }

  const createReply = async (annotationId: number, content: string) => {
    const result: any = await $fetch(`/api/annotations/${annotationId}/replies`, {
      method: 'POST',
      body: { content }
    })
    if (result.reply) {
      const annotation = annotations.value.find(a => a.id === annotationId)
      if (annotation) {
        if (!annotation.replies) annotation.replies = []
        annotation.replies.push(result.reply)
        if (annotation._count) {
          annotation._count.replies++
        }
      }
    }
    return result
  }

  const setActiveAnnotation = (id: number | null) => {
    activeAnnotationId.value = id
    if (id !== null) {
      isPanelOpen.value = true
      loadAnnotationDetail(id)
    }
  }

  const openPanel = () => {
    isPanelOpen.value = true
  }

  const closePanel = () => {
    isPanelOpen.value = false
    activeAnnotationId.value = null
  }

  const setFilter = (f: AnnotationFilter) => {
    filter.value = f
  }

  const setSelectedText = (text: string, start: number, end: number) => {
    selectedText.value = { text, startOffset: start, endOffset: end }
  }

  const clearSelectedText = () => {
    selectedText.value = null
  }

  const reset = () => {
    annotations.value = []
    activeAnnotationId.value = null
    filter.value = 'ALL'
    hoveredAnnotationId.value = null
    isPanelOpen.value = false
    hasPermission.value = false
    loading.value = false
    selectedText.value = null
  }

  return {
    annotations,
    activeAnnotation,
    activeAnnotationId,
    filter,
    filteredAnnotations,
    hoveredAnnotationId,
    isPanelOpen,
    hasPermission,
    loading,
    selectedText,
    pendingCount,
    resolvedCount,
    loadAnnotations,
    createAnnotation,
    updateStatus,
    loadAnnotationDetail,
    createReply,
    setActiveAnnotation,
    openPanel,
    closePanel,
    setFilter,
    setSelectedText,
    clearSelectedText,
    reset
  }
}
