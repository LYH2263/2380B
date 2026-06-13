<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold mb-2">我的订阅</h1>
          <p class="text-white/60">管理您订阅的小说，及时获取更新通知</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            v-if="selectedIds.length > 0"
            @click="handleBatchUnsubscribe"
            class="btn-danger"
            :disabled="unsubscribePending"
          >
            <Icon name="ph:bell-slash" class="mr-2" />
            取消订阅 ({{ selectedIds.length }})
          </button>
          <button
            v-if="subscriptions.length > 0"
            @click="toggleSelectAll"
            class="btn-secondary"
          >
            {{ isAllSelected ? '取消全选' : '全选' }}
          </button>
        </div>
      </div>

      <div v-if="pending" class="space-y-4">
        <div v-for="i in 3" :key="i" class="card p-4 animate-pulse">
          <div class="flex gap-4">
            <div class="w-24 h-32 bg-white/10 rounded-lg"></div>
            <div class="flex-1 space-y-3">
              <div class="h-6 bg-white/10 rounded w-1/3"></div>
              <div class="h-4 bg-white/10 rounded w-1/2"></div>
              <div class="h-4 bg-white/10 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="subscriptions.length === 0" class="text-center py-20">
        <Icon name="ph:bell-ringing" class="text-6xl text-white/30 mb-4" />
        <p class="text-xl text-white/50 mb-2">还没有订阅任何小说</p>
        <p class="text-white/30 mb-6">订阅小说后，更新时会及时通知您</p>
        <NuxtLink to="/novels" class="btn-primary">
          去小说库看看
        </NuxtLink>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="sub in subscriptions"
          :key="sub.id"
          class="card p-4 hover:border-neuro-primary/50 transition"
        >
          <div class="flex gap-4">
            <div class="flex items-start pt-1">
              <input
                type="checkbox"
                :checked="selectedIds.includes(sub.novelId)"
                @change="toggleSelect(sub.novelId)"
                class="w-5 h-5 rounded border-white/20 bg-white/5 text-neuro-primary focus:ring-neuro-primary"
              />
            </div>

            <NuxtLink
              :to="`/novels/${sub.novelId}`"
              class="w-24 h-32 flex-shrink-0 overflow-hidden rounded-lg"
            >
              <img
                :src="sub.novel.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'"
                :alt="sub.novel.title"
                class="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
              />
            </NuxtLink>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <NuxtLink
                    :to="`/novels/${sub.novelId}`"
                    class="text-xl font-bold hover:text-neuro-primary transition block truncate"
                  >
                    {{ sub.novel.title }}
                  </NuxtLink>
                  <div class="flex items-center gap-2 mt-1 text-sm text-white/50">
                    <img
                      :src="sub.novel.author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                      :alt="sub.novel.author?.username"
                      class="w-5 h-5 rounded-full"
                    />
                    <span>{{ sub.novel.author?.username }}</span>
                    <span>·</span>
                    <span>{{ sub.novel._count?.chapters || 0 }} 章</span>
                    <span>·</span>
                    <span>{{ sub.novel._count?.subscriptions || 0 }} 人订阅</span>
                  </div>
                </div>

                <div
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-medium',
                    statusClasses[sub.novel.status]
                  ]"
                >
                  {{ statusLabels[sub.novel.status] }}
                </div>
              </div>

              <p class="text-white/60 text-sm mt-2 line-clamp-2">
                {{ sub.novel.description }}
              </p>

              <div class="flex items-center justify-between mt-4">
                <div v-if="sub.novel.chapters?.[0]" class="text-sm">
                  <span class="text-white/50">最新章节：</span>
                  <NuxtLink
                    :to="`/novels/${sub.novelId}/chapters/${sub.novel.chapters[0].id}`"
                    class="text-neuro-primary hover:underline"
                  >
                    {{ sub.novel.chapters[0].title }}
                  </NuxtLink>
                  <span class="text-white/30 ml-2">
                    {{ formatDate(sub.novel.chapters[0].createdAt) }}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-xs text-white/40">
                    订阅于 {{ formatDate(sub.createdAt) }}
                  </span>
                  <button
                    @click="handleUnsubscribe(sub.novelId)"
                    class="text-sm text-red-400 hover:text-red-300 transition"
                  >
                    取消订阅
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="hasMore && !pending" class="text-center mt-8">
        <button @click="loadMore" class="btn-secondary" :disabled="loadingMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { toast } = useToast()
const { batchUnsubscribe } = useNotifications()

const page = ref(1)
const limit = 20
const hasMore = ref(false)
const pending = ref(true)
const loadingMore = ref(false)
const unsubscribePending = ref(false)
const selectedIds = ref<number[]>([])
const allSubscriptions = ref<any[]>([])

const { data, refresh } = await useFetch('/api/user/subscriptions', {
  query: { page: 1, limit }
})

const subscriptions = computed(() => {
  return data.value?.subscriptions || []
})

watch(data, (newVal) => {
  pending.value = false
  loadingMore.value = false
  if (newVal) {
    hasMore.value = newVal.hasMore
    if (page.value === 1) {
      allSubscriptions.value = newVal.subscriptions || []
    } else {
      allSubscriptions.value = [...allSubscriptions.value, ...(newVal.subscriptions || [])]
    }
  }
})

const isAllSelected = computed(() => {
  return subscriptions.value.length > 0 &&
    subscriptions.value.every((sub: any) => selectedIds.value.includes(sub.novelId))
})

const statusLabels: Record<string, string> = {
  ONGOING: '连载中',
  COMPLETED: '已完结',
  HIATUS: '暂停更新'
}

const statusClasses: Record<string, string> = {
  ONGOING: 'bg-green-500/20 text-green-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  HIATUS: 'bg-yellow-500/20 text-yellow-400'
}

const formatDate = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return d.toLocaleDateString('zh-CN')
}

const toggleSelect = (novelId: number) => {
  const index = selectedIds.value.indexOf(novelId)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(novelId)
  }
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = subscriptions.value.map((sub: any) => sub.novelId)
  }
}

const handleUnsubscribe = async (novelId: number) => {
  if (!confirm('确定要取消订阅这部小说吗？')) return

  try {
    unsubscribePending.value = true
    const result = await batchUnsubscribe([novelId])
    toast.success(result.message)
    selectedIds.value = selectedIds.value.filter(id => id !== novelId)
    await refresh()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    unsubscribePending.value = false
  }
}

const handleBatchUnsubscribe = async () => {
  if (selectedIds.value.length === 0) return
  if (!confirm(`确定要取消订阅选中的 ${selectedIds.value.length} 部小说吗？`)) return

  try {
    unsubscribePending.value = true
    const result = await batchUnsubscribe(selectedIds.value)
    toast.success(result.message)
    selectedIds.value = []
    await refresh()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    unsubscribePending.value = false
  }
}

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value) return

  loadingMore.value = true
  page.value++
  await useFetch('/api/user/subscriptions', {
    query: { page: page.value, limit }
  })
}

useHead({
  title: '我的订阅 - Neurosama 粉丝小说站'
})
</script>
