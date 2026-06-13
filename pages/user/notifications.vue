<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold mb-2">通知中心</h1>
          <p class="text-white/60">查看您的所有更新通知</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            v-if="totalUnread > 0"
            @click="handleMarkAllRead"
            class="btn-secondary"
            :disabled="markingRead"
          >
            <Icon name="ph:check-circle" class="mr-2" />
            全部已读
          </button>
          <NuxtLink to="/user/updates" class="btn-primary">
            <Icon name="ph:list-bullets" class="mr-2" />
            未读更新汇总
          </NuxtLink>
        </div>
      </div>

      <div v-if="pending" class="space-y-4">
        <div v-for="i in 5" :key="i" class="card p-4 animate-pulse">
          <div class="flex gap-4">
            <div class="w-12 h-12 bg-white/10 rounded-full"></div>
            <div class="flex-1 space-y-2">
              <div class="h-5 bg-white/10 rounded w-1/3"></div>
              <div class="h-4 bg-white/10 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="notifications.length === 0" class="text-center py-20">
        <Icon name="ph:bell" class="text-6xl text-white/30 mb-4" />
        <p class="text-xl text-white/50 mb-2">暂无通知</p>
        <p class="text-white/30">订阅小说后，更新时会在这里收到通知</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'card p-4 transition cursor-pointer',
            notification.read ? 'opacity-60' : 'border-neuro-primary/30 bg-neuro-primary/5'
          ]"
          @click="handleNotificationClick(notification)"
        >
          <div class="flex gap-4">
            <div class="flex-shrink-0">
              <div
                :class="[
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  typeColors[notification.type]
                ]"
              >
                <Icon :name="typeIcons[notification.type]" class="text-xl" />
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-semibold">
                  {{ notification.title }}
                  <span
                    v-if="!notification.read"
                    class="inline-block w-2 h-2 ml-2 bg-neuro-primary rounded-full align-middle"
                  ></span>
                </h3>
                <span class="text-xs text-white/40 flex-shrink-0">
                  {{ formatDate(notification.createdAt) }}
                </span>
              </div>
              <p class="text-white/70 text-sm mt-1">
                {{ notification.content }}
              </p>
              <div v-if="notification.novel" class="flex items-center gap-2 mt-3">
                <img
                  :src="notification.novel.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100'"
                  :alt="notification.novel.title"
                  class="w-10 h-14 object-cover rounded"
                />
                <div class="text-sm">
                  <div class="text-white/80">{{ notification.novel.title }}</div>
                  <div v-if="notification.chapter" class="text-white/50 text-xs">
                    {{ notification.chapter.title }}
                  </div>
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
const { markAsRead, markAllAsRead, fetchUnreadCount } = useNotifications()

const page = ref(1)
const limit = 20
const hasMore = ref(false)
const pending = ref(true)
const loadingMore = ref(false)
const markingRead = ref(false)
const allNotifications = ref<any[]>([])

const { data, refresh } = await useFetch('/api/user/notifications', {
  query: { page: 1, limit }
})

const notifications = computed(() => data.value?.notifications || [])
const totalUnread = computed(() => {
  return notifications.value.filter((n: any) => !n.read).length
})

watch(data, (newVal) => {
  pending.value = false
  loadingMore.value = false
  if (newVal) {
    hasMore.value = newVal.hasMore
    if (page.value === 1) {
      allNotifications.value = newVal.notifications || []
    } else {
      allNotifications.value = [...allNotifications.value, ...(newVal.notifications || [])]
    }
  }
})

const typeIcons: Record<string, string> = {
  NOVEL_UPDATE: 'ph:book-open-text-fill',
  SYSTEM: 'ph:gear-fill',
  MESSAGE: 'ph:chat-circle-text-fill',
  ACHIEVEMENT: 'ph:trophy-fill'
}

const typeColors: Record<string, string> = {
  NOVEL_UPDATE: 'bg-neuro-primary/20 text-neuro-primary',
  SYSTEM: 'bg-blue-500/20 text-blue-400',
  MESSAGE: 'bg-green-500/20 text-green-400',
  ACHIEVEMENT: 'bg-yellow-500/20 text-yellow-400'
}

const formatDate = (date: string) => {
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

const handleNotificationClick = async (notification: any) => {
  if (!notification.read) {
    try {
      await markAsRead(notification.id)
      await refresh()
    } catch (error: any) {
      console.error('Failed to mark as read:', error)
    }
  }

  if (notification.novelId && notification.chapterId) {
    navigateTo(`/novels/${notification.novelId}/chapters/${notification.chapterId}`)
  } else if (notification.novelId) {
    navigateTo(`/novels/${notification.novelId}`)
  }
}

const handleMarkAllRead = async () => {
  try {
    markingRead.value = true
    const result = await markAllAsRead()
    toast.success(`已将 ${result.updatedCount} 条通知标记为已读`)
    await refresh()
    await fetchUnreadCount()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    markingRead.value = false
  }
}

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value) return

  loadingMore.value = true
  page.value++
  await useFetch('/api/user/notifications', {
    query: { page: page.value, limit }
  })
}

useHead({
  title: '通知中心 - Neurosama 粉丝小说站'
})
</script>
