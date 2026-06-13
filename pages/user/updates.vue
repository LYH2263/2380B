<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold mb-2">未读更新汇总</h1>
          <p class="text-white/60">
            您有 {{ totalUnread }} 条未读更新，来自 {{ totalNovels }} 部小说
          </p>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink to="/user/notifications" class="btn-secondary">
            <Icon name="ph:bell" class="mr-2" />
            全部通知
          </NuxtLink>
          <button
            v-if="totalUnread > 0"
            @click="handleMarkAllRead"
            class="btn-primary"
            :disabled="markingRead"
          >
            <Icon name="ph:check-circle" class="mr-2" />
            全部已读
          </button>
        </div>
      </div>

      <div v-if="pending" class="space-y-4">
        <div v-for="i in 3" :key="i" class="card p-6 animate-pulse">
          <div class="flex gap-4">
            <div class="w-20 h-28 bg-white/10 rounded-lg"></div>
            <div class="flex-1 space-y-3">
              <div class="h-6 bg-white/10 rounded w-1/4"></div>
              <div class="h-4 bg-white/10 rounded w-1/3"></div>
              <div class="space-y-2 mt-4">
                <div class="h-4 bg-white/10 rounded w-full"></div>
                <div class="h-4 bg-white/10 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="novels.length === 0" class="text-center py-20">
        <Icon name="ph:sparkles" class="text-6xl text-white/30 mb-4" />
        <p class="text-xl text-white/50 mb-2">太棒了！没有未读更新</p>
        <p class="text-white/30 mb-6">订阅的小说都已阅读完毕</p>
        <NuxtLink to="/novels" class="btn-primary">
          发现更多小说
        </NuxtLink>
      </div>

      <div v-else class="space-y-6">
        <div
          v-for="group in novels"
          :key="group.novel.id"
          class="card overflow-hidden"
        >
          <div class="p-6 border-b border-white/10">
            <div class="flex gap-4">
              <NuxtLink
                :to="`/novels/${group.novel.id}`"
                class="w-20 h-28 flex-shrink-0 overflow-hidden rounded-lg"
              >
                <img
                  :src="group.novel.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'"
                  :alt="group.novel.title"
                  class="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
              </NuxtLink>

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <NuxtLink
                      :to="`/novels/${group.novel.id}`"
                      class="text-xl font-bold hover:text-neuro-primary transition block truncate"
                    >
                      {{ group.novel.title }}
                    </NuxtLink>
                    <div class="flex items-center gap-2 mt-1">
                      <span
                        :class="[
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          statusClasses[group.novel.status]
                        ]"
                      >
                        {{ statusLabels[group.novel.status] }}
                      </span>
                      <span class="text-white/40 text-sm">
                        {{ group.novel._count?.chapters || 0 }} 章
                      </span>
                      <span class="text-white/40 text-sm">·</span>
                      <span class="text-neuro-primary text-sm font-medium">
                        {{ group.unreadCount }} 条未读
                      </span>
                    </div>
                  </div>

                  <div class="text-right flex-shrink-0">
                    <div class="text-xs text-white/40">最新更新</div>
                    <div class="text-sm text-white/60">
                      {{ formatDate(group.latestUpdate) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="p-4">
            <h3 class="text-sm font-semibold text-white/60 mb-3">未读章节</h3>
            <div class="space-y-2">
              <div
                v-for="update in group.updates"
                :key="update.notificationId"
                class="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                @click="handleUpdateClick(update, group.novel.id)"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <Icon name="ph:book-open-text" class="text-neuro-primary flex-shrink-0" />
                  <div class="min-w-0">
                    <div class="font-medium truncate">
                      {{ update.chapter?.title || '新章节发布' }}
                    </div>
                    <div class="text-xs text-white/40">
                      {{ formatDate(update.createdAt) }}
                    </div>
                  </div>
                </div>
                <Icon name="ph:caret-right" class="text-white/40" />
              </div>
            </div>

            <div class="mt-4 flex justify-end">
              <button
                @click="handleMarkNovelRead(group)"
                class="text-sm text-neuro-primary hover:text-neuro-primary/80 transition"
              >
                标记该小说所有更新为已读
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { toast } = useToast()
const { markAsRead, markAllAsRead, fetchUnreadCount } = useNotifications()

const pending = ref(true)
const markingRead = ref(false)

const { data, refresh } = await useFetch('/api/user/notifications/updates-summary')

const novels = computed(() => data.value?.novels || [])
const totalUnread = computed(() => data.value?.totalUnread || 0)
const totalNovels = computed(() => data.value?.totalNovels || 0)

watch(data, (newVal) => {
  pending.value = false
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

const formatDate = (date: string | Date) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return d.toLocaleDateString('zh-CN')
}

const handleUpdateClick = async (update: any, novelId: number) => {
  try {
    await markAsRead(update.notificationId)
    await refresh()
  } catch (error: any) {
    console.error('Failed to mark as read:', error)
  }

  if (update.chapter?.id) {
    navigateTo(`/novels/${novelId}/chapters/${update.chapter.id}`)
  } else {
    navigateTo(`/novels/${novelId}`)
  }
}

const handleMarkNovelRead = async (group: any) => {
  try {
    markingRead.value = true
    for (const update of group.updates) {
      await markAsRead(update.notificationId)
    }
    toast.success(`已将《${group.novel.title}》的所有更新标记为已读`)
    await refresh()
    await fetchUnreadCount()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    markingRead.value = false
  }
}

const handleMarkAllRead = async () => {
  try {
    markingRead.value = true
    const result = await markAllAsRead()
    toast.success(`已将 ${result.updatedCount} 条更新标记为已读`)
    await refresh()
    await fetchUnreadCount()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    markingRead.value = false
  }
}

useHead({
  title: '未读更新汇总 - Neurosama 粉丝小说站'
})
</script>
