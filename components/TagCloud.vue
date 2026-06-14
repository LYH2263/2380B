<template>
  <div class="tag-cloud">
    <div v-if="loading" class="flex flex-wrap gap-2">
      <div v-for="i in 10" :key="i" class="h-6 w-16 bg-white/10 rounded-full animate-pulse" />
    </div>

    <div v-else-if="tags.length === 0" class="text-white/40 text-sm">
      暂无标签
    </div>

    <div v-else class="flex flex-wrap gap-2 items-center">
      <button
        v-for="tag in tags"
        :key="tag.id"
        @click="handleTagClick(tag)"
        :class="[
          'px-3 py-1.5 rounded-full text-sm transition-all hover:scale-105',
          getTagClass(tag),
          selectedTag === tag.name ? 'ring-2 ring-neuro-primary' : ''
        ]"
        :style="{ fontSize: getTagSize(tag) + 'px' }"
      >
        {{ tag.name }}
        <span v-if="showCount" class="ml-1 opacity-60 text-xs">
          {{ tag.useCount }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TagItem {
  id: number
  name: string
  category: string
  useCount: number
}

const props = withDefaults(defineProps<{
  limit?: number
  category?: string
  showCount?: boolean
  selectedTag?: string
  minSize?: number
  maxSize?: number
}>(), {
  limit: 30,
  category: '',
  showCount: true,
  selectedTag: '',
  minSize: 12,
  maxSize: 20
})

const emit = defineEmits<{
  (e: 'select', tag: TagItem): void
}>()

const loading = ref(true)
const tags = ref<TagItem[]>([])

const fetchTags = async () => {
  loading.value = true
  try {
    const res = await $fetch('/api/tags', {
      query: {
        type: 'popular',
        limit: props.limit,
        category: props.category || undefined
      }
    })
    tags.value = (res as any).tags || []
  } catch (e) {
    console.error('Failed to fetch tags:', e)
  } finally {
    loading.value = false
  }
}

const getTagSize = (tag: TagItem) => {
  if (tags.value.length === 0) return props.minSize
  const maxCount = Math.max(...tags.value.map(t => t.useCount), 1)
  const minCount = Math.min(...tags.value.map(t => t.useCount), 0)
  const range = maxCount - minCount || 1
  const ratio = (tag.useCount - minCount) / range
  return props.minSize + ratio * (props.maxSize - props.minSize)
}

const categoryColors: Record<string, string> = {
  GENRE: 'bg-blue-500/20 text-white hover:bg-blue-600',
  STYLE: 'bg-purple-500/',
  ELEMENT: 'bg-green-500/',
  OTHER: 'bg-gray-500/'
}

const getTagClass = (tag: TagItem) => {
  const base = 'text-white/80 hover:bg-white/10'
  if (selectedTag.value === tag.name) {
    return 'bg-neuro-primary text-white'
  }
  return `bg-white/5 hover:bg-white/10 text-white/80`
}

const handleTagClick = (tag: TagItem) => {
  emit('select', tag)
}

watch(() => [props.limit, props.category], () => {
  fetchTags()
}, { immediate: true })

defineExpose({
  refresh: fetchTags
})
</script>

<style scoped>
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
