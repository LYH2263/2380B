<template>
  <div class="markdown-editor" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- Toolbar -->
    <div class="md-toolbar">
      <div class="md-toolbar-left">
        <button
          v-for="tool in toolbarItems"
          :key="tool.name"
          class="md-tool-btn"
          :title="tool.title"
          @click="handleToolClick(tool)"
        >
          <Icon :name="tool.icon" />
        </button>
        <div class="md-toolbar-divider" />
        <button
          class="md-tool-btn"
          title="插入图片"
          @click="openImageUpload"
        >
          <Icon name="ph:image" />
        </button>
        <button
          class="md-tool-btn"
          title="插入链接"
          @click="insertLink"
        >
          <Icon name="ph:link" />
        </button>
      </div>
      <div class="md-toolbar-right">
        <span class="md-word-count">字数：{{ wordCount }}</span>
        <div class="md-mode-switcher">
          <button
            class="md-mode-btn"
            :class="{ active: mode === 'edit' }"
            @click="mode = 'edit'"
            title="仅编辑"
          >
            <Icon name="ph:pencil" />
          </button>
          <button
            class="md-mode-btn"
            :class="{ active: mode === 'split' }"
            @click="mode = 'split'"
            title="分屏预览"
          >
            <Icon name="ph:columns" />
          </button>
          <button
            class="md-mode-btn"
            :class="{ active: mode === 'preview' }"
            @click="mode = 'preview'"
            title="仅预览"
          >
            <Icon name="ph:eye" />
          </button>
        </div>
        <button
          class="md-tool-btn"
          :title="isFullscreen ? '退出全屏' : '全屏编辑'"
          @click="toggleFullscreen"
        >
          <Icon :name="isFullscreen ? 'ph:arrows-in' : 'ph:arrows-out'" />
        </button>
      </div>
    </div>

    <!-- Editor Content -->
    <div class="md-editor-content">
      <!-- Edit Panel -->
      <div
        v-show="mode !== 'preview'"
        class="md-edit-panel"
        :class="{ 'full-width': mode === 'edit' }"
        @drop="handleDrop"
        @dragover.prevent
      >
        <textarea
          ref="textareaRef"
          v-model="localValue"
          class="md-textarea"
          :placeholder="placeholder"
          @input="onInput"
          @keydown="onKeydown"
          @paste="handlePaste"
        />
      </div>

      <!-- Divider -->
      <div v-if="mode === 'split'" class="md-divider" />

      <!-- Preview Panel -->
      <div
        v-show="mode !== 'edit'"
        class="md-preview-panel"
        :class="{ 'full-width': mode === 'preview' }"
      >
        <div class="md-preview-content prose-novel" v-html="renderedHtml" />
      </div>
    </div>

    <!-- Image Upload Modal -->
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
          v-if="showImageModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          @click.self="showImageModal = false"
        >
          <div class="card p-6 w-full max-w-md">
            <h3 class="text-xl font-bold mb-4">插入图片</h3>

            <div class="space-y-4">
              <!-- Upload Area -->
              <div
                class="md-upload-area"
                :class="{ 'dragover': uploadDragover }"
                @click="triggerFileInput"
                @drop="handleImageDrop"
                @dragover.prevent="uploadDragover = true"
                @dragleave="uploadDragover = false"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileSelect"
                />
                <Icon name="ph:upload-simple" class="text-4xl text-white/50 mb-2" />
                <p class="text-white/70">点击或拖拽图片到此处上传</p>
                <p class="text-sm text-white/40 mt-1">支持 JPG、PNG、GIF 格式</p>
              </div>

              <div class="flex items-center gap-4">
                <div class="flex-1 h-px bg-white/10" />
                <span class="text-sm text-white/40">或</span>
                <div class="flex-1 h-px bg-white/10" />
              </div>

              <!-- URL Input -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-white/70">图片链接</label>
                <input
                  v-model="imageUrl"
                  type="text"
                  class="input-field"
                  placeholder="https://..."
                />
              </div>

              <!-- Alt Text -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-white/70">图片描述（可选）</label>
                <input
                  v-model="imageAlt"
                  type="text"
                  class="input-field"
                  placeholder="图片描述文字"
                />
              </div>
            </div>

            <div class="flex justify-end gap-4 mt-6">
              <button
                class="btn-secondary !py-2 !px-4"
                @click="showImageModal = false"
              >
                取消
              </button>
              <button
                class="btn-primary !py-2 !px-4"
                :disabled="uploading || (!imageUrl && !selectedFile)"
                @click="insertImage"
              >
                <span v-if="uploading">上传中...</span>
                <span v-else>插入</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Draft Saved Indicator -->
    <div
      v-if="showDraftSaved"
      class="md-draft-indicator"
    >
      <Icon name="ph:check-circle" class="text-green-400" />
      <span>草稿已自动保存</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'

interface ToolbarItem {
  name: string
  icon: string
  title: string
  prefix?: string
  suffix?: string
  blockPrefix?: string
  blockSuffix?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  draftKey?: string
  rows?: number
}>(), {
  placeholder: '开始写作...',
  rows: 20
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'image-upload', file: File): Promise<string>
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const localValue = ref(props.modelValue)
const mode = ref<'edit' | 'split' | 'preview'>('split')
const isFullscreen = ref(false)
const showImageModal = ref(false)
const imageUrl = ref('')
const imageAlt = ref('')
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadDragover = ref(false)
const showDraftSaved = ref(false)

const wordCount = computed(() => {
  return localValue.value.replace(/\s/g, '').length
})

const renderedHtml = computed(() => {
  try {
    return marked.parse(localValue.value) as string
  } catch (e) {
    return localValue.value
  }
})

const toolbarItems: ToolbarItem[] = [
  { name: 'bold', icon: 'ph:bold', title: '加粗 (Ctrl+B)', prefix: '**', suffix: '**' },
  { name: 'italic', icon: 'ph:italic', title: '斜体 (Ctrl+I)', prefix: '*', suffix: '*' },
  { name: 'strikethrough', icon: 'ph:strikethrough', title: '删除线', prefix: '~~', suffix: '~~' },
  { name: 'quote', icon: 'ph:quotes', title: '引用', blockPrefix: '> ' },
  { name: 'ol', icon: 'ph:list-numbers', title: '有序列表', blockPrefix: '1. ' },
  { name: 'ul', icon: 'ph:list', title: '无序列表', blockPrefix: '- ' },
  { name: 'hr', icon: 'ph:minus', title: '分割线', blockPrefix: '\n---\n' }
]

const onInput = () => {
  emit('update:modelValue', localValue.value)
}

const handleToolClick = (tool: ToolbarItem) => {
  if (!textareaRef.value) return
  const textarea = textareaRef.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = localValue.value.substring(start, end)
  const value = localValue.value

  let newText = ''
  let cursorOffset = 0

  if (tool.blockPrefix) {
    const lines = selectedText.split('\n')
    const prefixedLines = lines.map(line => tool.blockPrefix + line)
    newText = prefixedLines.join('\n')
    cursorOffset = tool.blockPrefix.length
  } else if (tool.prefix && tool.suffix) {
    if (selectedText) {
      newText = tool.prefix + selectedText + tool.suffix
      cursorOffset = tool.prefix.length
    } else {
      newText = tool.prefix + tool.suffix
      cursorOffset = tool.prefix.length
    }
  }

  localValue.value = value.substring(0, start) + newText + value.substring(end)

  nextTick(() => {
    textarea.focus()
    if (selectedText && tool.blockPrefix) {
      textarea.setSelectionRange(start, start + newText.length)
    } else if (tool.prefix && tool.suffix) {
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + (selectedText?.length || 0))
    }
  })
}

const insertLink = () => {
  if (!textareaRef.value) return
  const textarea = textareaRef.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = localValue.value.substring(start, end)

  const url = prompt('请输入链接地址:', 'https://')
  if (url === null) return

  const linkText = selectedText || '链接文字'
  const linkMarkdown = `[${linkText}](${url})`

  const value = localValue.value
  localValue.value = value.substring(0, start) + linkMarkdown + value.substring(end)

  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + 1, start + 1 + linkText.length)
  })
}

const openImageUpload = () => {
  imageUrl.value = ''
  imageAlt.value = ''
  selectedFile.value = null
  showImageModal.value = true
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const handleImageDrop = (e: DragEvent) => {
  e.preventDefault()
  uploadDragover.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0]
    if (file.type.startsWith('image/')) {
      selectedFile.value = file
    }
  }
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0]
    if (file.type.startsWith('image/')) {
      uploadAndInsertImage(file)
    }
  }
}

const handlePaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      e.preventDefault()
      const file = items[i].getAsFile()
      if (file) {
        await uploadAndInsertImage(file)
      }
      break
    }
  }
}

const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await $fetch('/api/upload/image', {
    method: 'POST',
    body: formData
  })

  return (response as any).url
}

const uploadAndInsertImage = async (file: File) => {
  if (!textareaRef.value) return
  const textarea = textareaRef.value
  const start = textarea.selectionStart

  uploading.value = true
  try {
    const url = await uploadImage(file)
    const alt = file.name.replace(/\.[^/.]+$/, '')
    const imageMarkdown = `![${alt}](${url})`

    const value = localValue.value
    localValue.value = value.substring(0, start) + imageMarkdown + value.substring(start)

    nextTick(() => {
      textarea.focus()
      const newPos = start + imageMarkdown.length
      textarea.setSelectionRange(newPos, newPos)
    })
  } catch (e: any) {
    console.error('图片上传失败:', e)
  } finally {
    uploading.value = false
  }
}

const insertImage = async () => {
  if (!textareaRef.value) return
  const textarea = textareaRef.value
  const start = textarea.selectionStart

  let url = imageUrl.value

  if (selectedFile.value) {
    uploading.value = true
    try {
      url = await uploadImage(selectedFile.value)
    } catch (e: any) {
      console.error('图片上传失败:', e)
      uploading.value = false
      return
    } finally {
      uploading.value = false
    }
  }

  if (!url) return

  const alt = imageAlt.value || '图片'
  const imageMarkdown = `![${alt}](${url})`

  const value = localValue.value
  localValue.value = value.substring(0, start) + imageMarkdown + value.substring(start)

  showImageModal.value = false
  imageUrl.value = ''
  imageAlt.value = ''
  selectedFile.value = null

  nextTick(() => {
    textarea.focus()
    const newPos = start + imageMarkdown.length
    textarea.setSelectionRange(newPos, newPos)
  })
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault()
      handleToolClick(toolbarItems[0])
    } else if (e.key === 'i' || e.key === 'I') {
      e.preventDefault()
      handleToolClick(toolbarItems[1])
    }
  }

  if (e.key === 'Tab') {
    e.preventDefault()
    if (!textareaRef.value) return
    const textarea = textareaRef.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = localValue.value

    if (e.shiftKey) {
      if (value.substring(start - 2, start) === '  ') {
        localValue.value = value.substring(0, start - 2) + value.substring(end)
        nextTick(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 2
        })
      }
    } else {
      localValue.value = value.substring(0, start) + '  ' + value.substring(end)
      nextTick(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      })
    }
  }
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  document.body.style.overflow = isFullscreen.value ? 'hidden' : ''
}

const draftStorageKey = computed(() => {
  return props.draftKey ? `md_draft_${props.draftKey}` : null
})

let autoSaveTimer: ReturnType<typeof setInterval> | null = null

const saveDraft = () => {
  if (!draftStorageKey.value || !localValue.value) return
  localStorage.setItem(draftStorageKey.value, JSON.stringify({
    content: localValue.value,
    savedAt: Date.now()
  }))
  showDraftSaved.value = true
  setTimeout(() => {
    showDraftSaved.value = false
  }, 2000)
}

const loadDraft = () => {
  if (!draftStorageKey.value) return null
  const saved = localStorage.getItem(draftStorageKey.value)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      return data.content
    } catch (e) {
      return null
    }
  }
  return null
}

const clearDraft = () => {
  if (!draftStorageKey.value) return
  localStorage.removeItem(draftStorageKey.value)
}

const hasDraft = computed(() => {
  if (!draftStorageKey.value) return false
  return !!localStorage.getItem(draftStorageKey.value)
})

watch(() => props.modelValue, (val) => {
  if (val !== localValue.value) {
    localValue.value = val
  }
})

onMounted(() => {
  if (draftStorageKey.value && !localValue.value) {
    const savedDraft = loadDraft()
    if (savedDraft) {
      const shouldRestore = confirm('检测到未保存的草稿，是否恢复？')
      if (shouldRestore) {
        localValue.value = savedDraft
        emit('update:modelValue', savedDraft)
      } else {
        clearDraft()
      }
    }
  }

  autoSaveTimer = setInterval(() => {
    saveDraft()
  }, 30000)
})

onBeforeUnmount(() => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
  document.body.style.overflow = ''
})

defineExpose({
  clearDraft,
  saveDraft,
  hasDraft
})
</script>

<style scoped>
.markdown-editor {
  @apply flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden;
}

.markdown-editor.is-fullscreen {
  @apply fixed inset-0 z-40 rounded-none;
}

.md-toolbar {
  @apply flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10;
}

.md-toolbar-left,
.md-toolbar-right {
  @apply flex items-center gap-1;
}

.md-tool-btn {
  @apply p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all;
}

.md-toolbar-divider {
  @apply w-px h-6 bg-white/10 mx-2;
}

.md-word-count {
  @apply text-sm text-white/50 mr-4;
}

.md-mode-switcher {
  @apply flex items-center bg-white/5 rounded-lg p-1;
}

.md-mode-btn {
  @apply p-1.5 rounded-md text-white/50 hover:text-white transition-all;
}

.md-mode-btn.active {
  @apply bg-white/10 text-white;
}

.md-editor-content {
  @apply flex flex-1 overflow-hidden;
  min-height: 400px;
}

.md-edit-panel {
  @apply flex-1 flex flex-col;
}

.md-edit-panel.full-width {
  @apply w-full;
}

.md-textarea {
  @apply flex-1 w-full p-4 bg-transparent text-white font-mono text-sm leading-relaxed resize-none outline-none;
  tab-size: 2;
}

.md-textarea::placeholder {
  @apply text-white/30;
}

.md-divider {
  @apply w-px bg-white/10;
}

.md-preview-panel {
  @apply flex-1 overflow-auto;
}

.md-preview-panel.full-width {
  @apply w-full;
}

.md-preview-content {
  @apply p-4;
}

.md-preview-content :deep(h1),
.md-preview-content :deep(h2),
.md-preview-content :deep(h3),
.md-preview-content :deep(h4),
.md-preview-content :deep(h5),
.md-preview-content :deep(h6) {
  @apply font-bold text-white mt-6 mb-4;
}

.md-preview-content :deep(h1) {
  @apply text-2xl;
}

.md-preview-content :deep(h2) {
  @apply text-xl;
}

.md-preview-content :deep(h3) {
  @apply text-lg;
}

.md-preview-content :deep(p) {
  @apply mb-4 text-gray-300 leading-relaxed;
}

.md-preview-content :deep(blockquote) {
  @apply border-l-4 border-neuro-primary/50 pl-4 my-4 text-white/70 italic;
}

.md-preview-content :deep(ul),
.md-preview-content :deep(ol) {
  @apply mb-4 pl-6 text-gray-300;
}

.md-preview-content :deep(ul) {
  @apply list-disc;
}

.md-preview-content :deep(ol) {
  @apply list-decimal;
}

.md-preview-content :deep(li) {
  @apply mb-1;
}

.md-preview-content :deep(hr) {
  @apply my-6 border-white/10;
}

.md-preview-content :deep(a) {
  @apply text-neuro-primary hover:underline;
}

.md-preview-content :deep(img) {
  @apply max-w-full h-auto rounded-lg my-4;
}

.md-preview-content :deep(code) {
  @apply bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-neuro-primary;
}

.md-preview-content :deep(pre) {
  @apply bg-white/5 p-4 rounded-lg overflow-x-auto my-4;
}

.md-preview-content :deep(pre code) {
  @apply bg-transparent p-0;
}

.md-preview-content :deep(table) {
  @apply w-full border-collapse my-4;
}

.md-preview-content :deep(th),
.md-preview-content :deep(td) {
  @apply border border-white/10 px-4 py-2 text-left;
}

.md-preview-content :deep(th) {
  @apply bg-white/5 font-semibold;
}

.md-upload-area {
  @apply flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-neuro-primary/50 hover:bg-white/5 transition-all;
}

.md-upload-area.dragover {
  @apply border-neuro-primary bg-neuro-primary/10;
}

.md-draft-indicator {
  @apply fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm text-white/70 z-50;
  animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
