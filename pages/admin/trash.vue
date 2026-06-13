<template>
  <div>
    <div class="flex items-center gap-4 mb-8">
      <div class="flex-1">
        <h1 class="text-3xl font-bold">回收站</h1>
        <p class="text-white/60">删除的章节将在此保留30天，过期后自动永久删除</p>
      </div>
    </div>

    <!-- Chapters in Trash -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="p-12 text-center text-white/50">
        <Icon name="ph:spinner" class="animate-spin text-4xl mb-4" />
        <p>加载中...</p>
      </div>
      <div v-else-if="!chapters.length" class="p-12 text-center text-white/50">
        <Icon name="ph:trash" class="text-4xl mb-4" />
        <p>回收站为空</p>
      </div>
      <div v-else class="divide-y divide-white/10">
        <div
          v-for="chapter in chapters"
          :key="chapter.id"
          class="flex items-center justify-between p-4 hover:bg-white/5 transition"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
              <Icon name="ph:file-text" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="font-medium">{{ chapter.title }}</p>
                <span
                  :class="[
                    'text-xs px-2 py-0.5 rounded',
                    chapter.daysLeft <= 7 ? 'bg-red-500/30 text-red-300' : 'bg-white/10 text-white/60'
                  ]"
                >
                  剩余 {{ chapter.daysLeft }} 天
                </span>
              </div>
              <div class="flex items-center gap-3 text-sm text-white/50 mt-1">
                <span>所属小说：{{ chapter.novel?.title || '未知' }}</span>
                <span>·</span>
                <span>作者：{{ chapter.novel?.author?.username || '未知' }}</span>
                <span>·</span>
                <span>{{ chapter.wordCount }} 字</span>
                <span>·</span>
                <span>删除时间：{{ formatDate(chapter.deletedAt) }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="restoreChapter(chapter)"
              class="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition"
              title="恢复"
            >
              <Icon name="ph:arrow-counter-clockwise" />
            </button>
            <button
              @click="deletePermanently(chapter)"
              class="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition"
              title="永久删除"
            >
              <Icon name="ph:trash-bold" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Restore Confirmation -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="restoreTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-md w-full">
            <h3 class="text-xl font-bold mb-4">确认恢复</h3>
            <p class="text-white/70 mb-6">
              确定要恢复章节「{{ restoreTarget.title }}」吗？
            </p>
            <div class="flex justify-end gap-4">
              <Button @click="restoreTarget = null" variant="secondary">取消</Button>
              <Button @click="confirmRestore" :loading="actionLoading" variant="primary">确认恢复</Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Permanent Delete Confirmation -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-md w-full">
            <h3 class="text-xl font-bold mb-4">永久删除</h3>
            <p class="text-white/70 mb-6">
              确定要永久删除章节「{{ deleteTarget.title }}」吗？
              <br />
              <span class="text-red-400 text-sm">此操作不可撤销！</span>
            </p>
            <div class="flex justify-end gap-4">
              <Button @click="deleteTarget = null" variant="secondary">取消</Button>
              <Button @click="confirmDelete" :loading="actionLoading" variant="danger">永久删除</Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const toast = useToast()

const chapters = ref<any[]>([])
const loading = ref(false)
const actionLoading = ref(false)
const restoreTarget = ref<any>(null)
const deleteTarget = ref<any>(null)

const loadChapters = async () => {
  loading.value = true
  chapters.value = []
  try {
    const data: any = await $fetch('/api/admin/trash/chapters')
    chapters.value = data.chapters || []
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const restoreChapter = (chapter: any) => {
  restoreTarget.value = chapter
}

const confirmRestore = async () => {
  if (!restoreTarget.value) return

  actionLoading.value = true
  try {
    await $fetch(`/api/admin/trash/chapters/${restoreTarget.value.id}/restore`, {
      method: 'POST'
    })
    toast.success('恢复成功')
    restoreTarget.value = null
    await loadChapters()
  } catch (e: any) {
    toast.error(e.message || '恢复失败')
  } finally {
    actionLoading.value = false
  }
}

const deletePermanently = (chapter: any) => {
  deleteTarget.value = chapter
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return

  actionLoading.value = true
  try {
    await $fetch(`/api/admin/trash/chapters/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    toast.success('已永久删除')
    deleteTarget.value = null
    await loadChapters()
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  } finally {
    actionLoading.value = false
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

onMounted(() => {
  loadChapters()
})

useHead({
  title: '回收站'
})
</script>
