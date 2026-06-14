<template>
  <div class="tag-input-wrapper relative">
    <!-- Selected Tags -->
    <div
      ref="inputContainer"
      class="input-field flex flex-wrap gap-2 items-center min-h-[42px] cursor-text"
      @click="focusInput"
    >
      <span
        v-for="tag in selectedTags"
        :key="tag"
        class="inline-flex items-center gap-1 px-2 py-1 bg-neuro-primary/20 border border-neuro-primary/50 rounded-full text-sm"
      >
        {{ tag }}
        <button
          type="button"
          @click.stop="removeTag(tag)"
          class="hover:text-neuro-primary transition"
        >
          <Icon name="ph:x" class="w-3 h-3" />
        </button>
      </span>

      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        class="flex-1 min-w-[100px] bg-transparent outline-none border-none p-0"
        :placeholder="selectedTags.length === 0 ? placeholder : ''"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="handleFocus"
        @blur="handleBlur"
        autocomplete="off"
      />
    </div>

    <!-- Suggestions Dropdown -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showSuggestions && suggestions.length > 0"
        class="absolute z-50 w-full mt-1 bg-dark-card border border-white/10 rounded-xl shadow-xl overflow-hidden"
      >
        <div class="max-h-60 overflow-y-auto">
          <button
            v-for="(tag, index) in suggestions"
            :key="tag.id"
            type="button"
            @click="selectSuggestion(tag)"
            @mouseenter="activeIndex = index"
            :class="[
              'w-full px-3 py-2 text-left flex items-center justify-between transition',
              activeIndex === index ? 'bg-white/10' : 'hover:bg-white/5'
            ]"
          >
            <div class="flex items-center gap-2">
              <Icon name="ph:tag" class="w-4 h-4 text-white/50" />
              <span>{{ tag.name }}</span>
              <span class="text-xs text-white/40 px-2 py-0.5 bg-white/5 rounded">
                {{ categoryLabels[tag.category] || tag.category }}
              </span>
            </div>
            <span class="text-xs text-white/40">{{ tag.useCount }} 本</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Smart Recommendations -->
    <div v-if="showRecommendations && recommendations.length > 0" class="mt-3">
      <div class="flex items-center gap-2 mb-2">
        <Icon name="ph:lightbulb" class="w-4 h-4 text-yellow-400" />
        <span class="text-sm text-white/60">智能推荐标签</span>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in recommendations"
          :key="tag.id"
          type="button"
          @click="addTag(tag.name)"
          :class="[
            'px-2.5 py-1 text-xs rounded-full transition',
            selectedTags.includes(tag.name)
              ? 'bg-neuro-primary/30 text-neuro-primary border border-neuro-primary/50'
              : 'bg-white/5 text-white/70 hover:bg-white/10 border border-transparent'
          ]"
        >
          <span v-if="selectedTags.includes(tag.name)">
            <Icon name="ph:check" class="w-3 h-3 inline mr-1" />
          </span>
          {{ tag.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TagSuggestion {
  id: number
  name: string
  category: string
  useCount: number
}

const props = withDefaults(defineProps<{
  modelValue: string[]
  placeholder?: string
  enableRecommendations?: boolean
  recommendationTitle?: string
  recommendationDescription?: string
}>(), {
  placeholder: '输入标签，按回车添加...',
  enableRecommendations: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'recommend', title: string, description: string): void
}>()

const selectedTags = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const inputRef = ref<HTMLInputElement | null>(null)
const inputContainer = ref<HTMLDivElement | null>(null)
const inputValue = ref('')
const suggestions = ref<TagSuggestion[]>([])
const showSuggestions = ref(false)
const activeIndex = ref(0)
const recommendations = ref<TagSuggestion[]>([])
const showRecommendations = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const categoryLabels: Record<string, string> = {
  GENRE: '题材',
  STYLE: '风格',
  ELEMENT: '元素',
  OTHER: '其他'
}

const focusInput = () => {
  inputRef.value?.focus()
}

const handleInput = () => {
  const value = inputValue.value.trim()

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  if (!value) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }

  debounceTimer = setTimeout(async () => {
    try {
      const res = await $fetch('/api/tags', {
        query: {
          type: 'search',
          q: value,
          limit: 8
        }
      })
      suggestions.value = (res as any).tags.filter(
        (tag: TagSuggestion) => !selectedTags.value.includes(tag.name)
      )
      showSuggestions.value = suggestions.value.length > 0
      activeIndex.value = 0
    } catch (e) {
      console.error('Failed to search tags:', e)
    }
  }, 150)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (showSuggestions.value && suggestions.value.length > 0) {
      selectSuggestion(suggestions.value[activeIndex.value])
    } else if (inputValue.value.trim()) {
      addTag(inputValue.value.trim())
    }
  } else if (e.key === 'Backspace' && !inputValue.value && selectedTags.value.length > 0) {
    const newTags = [...selectedTags.value]
    newTags.pop()
    selectedTags.value = newTags
  } else if (e.key === 'ArrowDown' && suggestions.value.length > 0) {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
  } else if (e.key === 'ArrowUp' && suggestions.value.length > 0) {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (e.key === 'Escape') {
    showSuggestions.value = false
  }
}

const handleFocus = () => {
  if (inputValue.value.trim() && suggestions.value.length > 0) {
    showSuggestions.value = true
  }
}

const handleBlur = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const addTag = (tagName: string) => {
  const trimmed = tagName.trim()
  if (!trimmed || selectedTags.value.includes(trimmed)) return

  selectedTags.value = [...selectedTags.value, trimmed]
  inputValue.value = ''
  suggestions.value = []
  showSuggestions.value = false
}

const removeTag = (tagName: string) => {
  selectedTags.value = selectedTags.value.filter(t => t !== tagName)
}

const selectSuggestion = (tag: TagSuggestion) => {
  addTag(tag.name)
}

const getRecommendations = async (title: string, description: string) => {
  if (!title && !description) {
    recommendations.value = []
    showRecommendations.value = false
    return
  }

  try {
    const res = await $fetch('/api/tags/recommend', {
      method: 'POST',
      body: {
        title,
        description,
        limit: 10
      }
    })
    recommendations.value = (res as any).tags || []
    showRecommendations.value = recommendations.value.length > 0
  } catch (e) {
    console.error('Failed to get recommendations:', e)
  }
}

defineExpose({
  focus: focusInput,
  getRecommendations
})
</script>

<style scoped>
.tag-input-wrapper {
  width: 100%;
}
</style>
