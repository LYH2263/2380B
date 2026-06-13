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
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" @click.self="close">
        <div class="card p-6 w-full max-w-5xl my-8 max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold">章节历史版本</h3>
            <button @click="close" class="p-2 hover:bg-white/10 rounded-lg transition">
              <Icon name="ph:x" />
            </button>
          </div>

          <div class="flex gap-4 flex-1 overflow-hidden">
            <!-- 左侧版本列表 -->
            <div class="w-72 flex-shrink-0 border border-white/10 rounded-xl overflow-hidden flex flex-col">
              <div class="p-3 border-b border-white/10 bg-white/5">
                <div class="flex items-center gap-2">
                  <Icon name="ph:clock-counter-clockwise" />
                  <span class="font-medium">版本列表</span>
                  <span class="ml-auto text-sm text-white/50">{{ versions.length }} 个版本</span>
                </div>
              </div>
              <div class="flex-1 overflow-y-auto">
                <div v-if="loading" class="p-8 text-center text-white/50">
                  <Icon name="ph:spinner" class="animate-spin text-2xl mb-2" />
                  <p>加载中...</p>
                </div>
                <div v-else-if="!versions.length" class="p-8 text-center text-white/50">
                  <Icon name="ph:file-x" class="text-3xl mb-2" />
                  <p>暂无历史版本</p>
                </div>
                <div v-else class="divide-y divide-white/10">
                  <div
                    v-for="v in versions"
                    :key="v.id"
                    @click="selectVersion(v)"
                    :class="[
                      'p-3 cursor-pointer transition',
                      selectedVersion?.id === v.id ? 'bg-neuro-primary/20 border-l-2 border-neuro-primary' : 'hover:bg-white/5'
                    ]"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-mono text-sm bg-white/10 px-2 py-0.5 rounded">v{{ v.versionNum }}</span>
                      <span v-if="v.type === 'RESTORE'" class="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">恢复</span>
                      <span v-else-if="v.type === 'FULL'" class="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">初始</span>
                      <span v-if="v.isKeyNode" class="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded">关键</span>
                    </div>
                    <p class="text-sm font-medium truncate">{{ v.title }}</p>
                    <div class="flex items-center gap-2 mt-1 text-xs text-white/50">
                      <span>{{ formatDate(v.createdAt) }}</span>
                    </div>
                    <div class="flex items-center gap-2 mt-1 text-xs">
                      <span :class="v.wordDiff > 0 ? 'text-green-400' : v.wordDiff < 0 ? 'text-red-400' : 'text-white/50'">
                        {{ v.wordDiff > 0 ? '+' : '' }}{{ v.wordDiff }} 字
                      </span>
                      <span class="text-white/40">·</span>
                      <span class="text-white/50">共 {{ v.wordCount }} 字</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧内容区 -->
            <div class="flex-1 border border-white/10 rounded-xl overflow-hidden flex flex-col">
              <!-- Tab切换 -->
              <div class="flex border-b border-white/10 bg-white/5">
                <button
                  @click="activeTab = 'preview'"
                  :class="[
                    'flex-1 px-4 py-3 text-sm font-medium transition',
                    activeTab === 'preview' ? 'text-neuro-primary border-b-2 border-neuro-primary bg-white/5' : 'text-white/60 hover:text-white'
                  ]"
                >
                  <Icon name="ph:eye" class="inline mr-1" />
                  版本预览
                </button>
                <button
                  @click="activeTab = 'diff'"
                  :class="[
                    'flex-1 px-4 py-3 text-sm font-medium transition',
                    activeTab === 'diff' ? 'text-neuro-primary border-b-2 border-neuro-primary bg-white/5' : 'text-white/60 hover:text-white'
                  ]"
                >
                  <Icon name="ph:git-compare" class="inline mr-1" />
                  版本对比
                </button>
              </div>

              <!-- 预览模式 -->
              <div v-if="activeTab === 'preview'" class="flex-1 overflow-y-auto p-4">
                <div v-if="!selectedVersion" class="h-full flex items-center justify-center text-white/50">
                  <div class="text-center">
                    <Icon name="ph:selection" class="text-4xl mb-2" />
                    <p>请从左侧选择一个版本查看</p>
                  </div>
                </div>
                <div v-else-if="previewLoading" class="h-full flex items-center justify-center text-white/50">
                  <Icon name="ph:spinner" class="animate-spin text-2xl" />
                </div>
                <div v-else-if="versionDetail" class="space-y-4">
                  <div class="p-3 bg-white/5 rounded-lg">
                    <h4 class="font-bold text-lg">{{ versionDetail.title }}</h4>
                    <div class="flex items-center gap-3 mt-2 text-sm text-white/60">
                      <span>版本号：v{{ versionDetail.versionNum }}</span>
                      <span>保存时间：{{ formatDate(versionDetail.createdAt) }}</span>
                      <span>字数：{{ versionDetail.wordCount }}</span>
                    </div>
                  </div>
                  <div class="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-black/20 p-4 rounded-lg">
                    {{ versionDetail.content }}
                  </div>
                  <div class="flex justify-end gap-3">
                    <Button @click="confirmRestore" variant="danger" :loading="restoreLoading">
                      <Icon name="ph:arrow-counter-clockwise" class="mr-2" />
                      恢复到此版本
                    </Button>
                  </div>
                </div>
              </div>

              <!-- 对比模式 -->
              <div v-if="activeTab === 'diff'" class="flex-1 overflow-hidden flex flex-col">
                <div class="p-3 border-b border-white/10 bg-white/5 flex items-center gap-4">
                  <div class="flex-1">
                    <label class="text-xs text-white/60 block mb-1">选择源版本（旧）</label>
                    <select
                      v-model="diffFromId"
                      class="input-field text-sm w-full"
                      :disabled="!versions.length"
                    >
                      <option value="">请选择</option>
                      <option v-for="v in versions" :key="v.id" :value="v.id">
                        v{{ v.versionNum }} - {{ v.title }}
                      </option>
                    </select>
                  </div>
                  <Icon name="ph:arrow-right" class="text-white/40" />
                  <div class="flex-1">
                    <label class="text-xs text-white/60 block mb-1">选择目标版本（新）</label>
                    <select
                      v-model="diffToId"
                      class="input-field text-sm w-full"
                      :disabled="!versions.length"
                    >
                      <option value="">请选择</option>
                      <option v-for="v in versions" :key="v.id" :value="v.id">
                        v{{ v.versionNum }} - {{ v.title }}
                      </option>
                    </select>
                  </div>
                  <Button @click="loadDiff" :disabled="!diffFromId || !diffToId || diffLoading" :loading="diffLoading" size="sm">
                    <Icon name="ph:magnifying-glass" class="mr-1" />
                    对比
                  </Button>
                </div>

                <div class="flex-1 overflow-y-auto p-4">
                  <div v-if="!diffResult" class="h-full flex items-center justify-center text-white/50">
                    <div class="text-center">
                      <Icon name="ph:git-compare" class="text-4xl mb-2" />
                      <p>请选择两个版本进行对比</p>
                    </div>
                  </div>
                  <div v-else>
                    <div class="p-3 bg-white/5 rounded-lg mb-4">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                          <div>
                            <span class="text-xs text-white/60">v{{ diffResult.fromVersion.versionNum }}</span>
                            <p class="text-sm font-medium">{{ diffResult.fromVersion.title }}</p>
                            <p class="text-xs text-white/50">{{ formatDate(diffResult.fromVersion.createdAt) }} · {{ diffResult.fromVersion.wordCount }} 字</p>
                          </div>
                          <Icon name="ph:arrow-right" class="text-white/40" />
                          <div>
                            <span class="text-xs text-white/60">v{{ diffResult.toVersion.versionNum }}</span>
                            <p class="text-sm font-medium">{{ diffResult.toVersion.title }}</p>
                            <p class="text-xs text-white/50">{{ formatDate(diffResult.toVersion.createdAt) }} · {{ diffResult.toVersion.wordCount }} 字</p>
                          </div>
                        </div>
                        <div class="flex items-center gap-4 text-sm">
                          <span class="text-green-400">+{{ diffResult.stats.insertions }} 新增</span>
                          <span class="text-red-400">-{{ diffResult.stats.deletions }} 删除</span>
                          <span :class="diffResult.stats.wordDiff > 0 ? 'text-green-400' : 'text-red-400'">
                            {{ diffResult.stats.wordDiff > 0 ? '+' : '' }}{{ diffResult.stats.wordDiff }} 字
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="p-4 bg-black/30 rounded-lg font-mono text-sm leading-relaxed whitespace-pre-wrap" v-html="diffResult.diffHtml"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 恢复确认对话框 -->
          <Teleport to="body">
            <Transition
              enter-active-class="transition duration-200"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              leave-active-class="transition duration-150"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <div v-if="showRestoreConfirm" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
                <div class="card p-6 max-w-md w-full">
                  <h3 class="text-xl font-bold mb-4">确认恢复版本</h3>
                  <p class="text-white/70 mb-6">
                    确定要将章节内容恢复到 <span class="text-neuro-primary font-bold">v{{ selectedVersion?.versionNum }}</span> 版本吗？
                    <br />
                    <span class="text-sm">当前内容将作为新版本保存，不会丢失。</span>
                  </p>
                  <div class="flex justify-end gap-4">
                    <Button @click="showRestoreConfirm = false" variant="secondary">取消</Button>
                    <Button @click="doRestore" variant="danger" :loading="restoreLoading">确认恢复</Button>
                  </div>
                </div>
              </div>
            </Transition>
          </Teleport>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  novelId: number | string
  chapterId: number | string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'restored'): void
}>()

const toast = useToast()

const versions = ref<any[]>([])
const loading = ref(false)
const selectedVersion = ref<any>(null)
const versionDetail = ref<any>(null)
const previewLoading = ref(false)
const restoreLoading = ref(false)
const showRestoreConfirm = ref(false)

const activeTab = ref<'preview' | 'diff'>('preview')
const diffFromId = ref<number | null>(null)
const diffToId = ref<number | null>(null)
const diffResult = ref<any>(null)
const diffLoading = ref(false)

const close = () => {
  emit('close')
}

const loadVersions = async () => {
  if (!props.chapterId || !props.novelId) return

  loading.value = true
  versions.value = []
  selectedVersion.value = null
  versionDetail.value = null
  diffResult.value = null
  diffFromId.value = null
  diffToId.value = null

  try {
    const data: any = await $fetch(`/api/novels/${props.novelId}/chapters/${props.chapterId}/versions`)
    versions.value = data.versions || []
  } catch (e: any) {
    toast.error(e.message || '加载版本列表失败')
  } finally {
    loading.value = false
  }
}

const selectVersion = async (v: any) => {
  selectedVersion.value = v
  versionDetail.value = null
  previewLoading.value = true

  try {
    const data: any = await $fetch(`/api/novels/${props.novelId}/chapters/${props.chapterId}/versions/${v.id}`)
    versionDetail.value = data
  } catch (e: any) {
    toast.error(e.message || '加载版本内容失败')
  } finally {
    previewLoading.value = false
  }
}

const confirmRestore = () => {
  showRestoreConfirm.value = true
}

const doRestore = async () => {
  if (!selectedVersion.value) return

  restoreLoading.value = true
  try {
    await $fetch(`/api/novels/${props.novelId}/chapters/${props.chapterId}/versions/${selectedVersion.value.id}/restore`, {
      method: 'POST'
    })
    toast.success('版本恢复成功')
    showRestoreConfirm.value = false
    emit('restored')
    close()
  } catch (e: any) {
    toast.error(e.message || '恢复失败')
  } finally {
    restoreLoading.value = false
  }
}

const loadDiff = async () => {
  if (!diffFromId.value || !diffToId.value) return

  diffLoading.value = true
  diffResult.value = null

  try {
    const data: any = await $fetch(`/api/novels/${props.novelId}/chapters/${props.chapterId}/versions/diff`, {
      params: {
        from: diffFromId.value,
        to: diffToId.value
      }
    })
    diffResult.value = data
  } catch (e: any) {
    toast.error(e.message || '对比失败')
  } finally {
    diffLoading.value = false
  }
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

watch(() => props.visible, (val) => {
  if (val) {
    loadVersions()
  }
})
</script>
