<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4 max-w-6xl">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div class="flex items-center gap-3">
          <Icon name="ph:trophy-fill" class="text-3xl text-yellow-400" />
          <h1 class="text-3xl font-bold">成就殿堂</h1>
        </div>

        <button
          @click="forceRefresh"
          :disabled="refreshing"
          class="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
        >
          <Icon :name="refreshing ? 'ph:spinner-gap' : 'ph:arrow-clockwise'" :class="refreshing ? 'animate-spin' : ''" />
          {{ refreshing ? '刷新中...' : '刷新成就' }}
        </button>
      </div>

      <div v-if="pending" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div v-for="i in 3" :key="i" class="card p-6 h-40 animate-pulse">
          <div class="h-8 bg-white/10 rounded w-1/3 mb-4" />
          <div class="h-4 bg-white/10 rounded w-full mb-2" />
          <div class="h-24 bg-white/10 rounded-xl mt-4" />
        </div>
      </div>

      <template v-else>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div class="card p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/20 flex items-center justify-center">
                <Icon name="ph:check-circle-fill" class="text-2xl text-green-400" />
              </div>
              <div>
                <div class="text-3xl font-bold text-green-400">{{ stats?.unlocked || 0 }}</div>
                <div class="text-sm text-white/60">已解锁成就</div>
              </div>
            </div>
            <div class="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                :style="{ width: (stats?.progressPercent || 0) + '%' }"
              />
            </div>
            <div class="text-xs text-white/50 mt-2 text-right">
              完成度 {{ stats?.progressPercent || 0 }}%
            </div>
          </div>

          <div class="card p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-sky-500/20 flex items-center justify-center">
                <Icon name="ph:target" class="text-2xl text-blue-400" />
              </div>
              <div>
                <div class="text-3xl font-bold text-blue-400">{{ stats?.total || 0 }}</div>
                <div class="text-sm text-white/60">总成就数量</div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-white/5 rounded-xl p-3 text-center">
                <div class="text-lg font-semibold">{{ remaining }}</div>
                <div class="text-xs text-white/50">待解锁</div>
              </div>
              <div class="bg-white/5 rounded-xl p-3 text-center">
                <div class="text-lg font-semibold text-yellow-400">+{{ stats?.totalPointsEarned || 0 }}</div>
                <div class="text-xs text-white/50">已获积分</div>
              </div>
            </div>
          </div>

          <div class="card p-6">
            <div class="text-sm text-white/60 mb-3">最近解锁</div>
            <div v-if="!recentUnlocks || recentUnlocks.length === 0" class="text-center py-6 text-white/40">
              <Icon name="ph:seal-question" class="text-3xl mb-2" />
              <p class="text-sm">还没有解锁任何成就</p>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="ach in recentUnlocks"
                :key="ach.code"
                class="flex items-center gap-3 bg-white/5 rounded-xl p-3"
              >
                <span class="text-2xl">{{ ach.icon }}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">{{ ach.name }}</div>
                  <div class="text-xs text-white/50">{{ formatTime(ach.unlockedAt) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-8">
          <div v-for="(items, category) in achievementsByCategory" :key="category">
            <div class="flex items-center gap-3 mb-4">
              <div
                :class="[
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  categoryBgClasses[category as string] || 'bg-white/10'
                ]"
              >
                <Icon :name="categoryIcons[category as string] || 'ph:star'" class="text-xl" />
              </div>
              <div>
                <h2 class="text-xl font-bold">{{ categoryNames[category as string] || category }}</h2>
                <div class="text-sm text-white/50">
                  {{ items.filter(a => a.isUnlocked).length }} / {{ items.length }} 已解锁
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <div
                v-for="ach in items"
                :key="ach.code"
                :class="[
                  'card p-4 text-center transition-all relative group',
                  ach.isUnlocked
                    ? 'border-neuro-primary/50 hover:border-neuro-primary'
                    : 'opacity-60 grayscale hover:opacity-80 hover:grayscale-0'
                ]"
              >
                <div
                  :class="[
                    'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-5xl mb-3 relative',
                    ach.isUnlocked
                      ? 'bg-gradient-to-br from-neuro-primary/20 to-neuro-secondary/20 shadow-lg shadow-neuro-primary/20 animate-pulse-glow'
                      : 'bg-white/5'
                  ]"
                >
                  {{ ach.icon }}
                </div>

                <h3
                  :class="[
                    'font-bold mb-1',
                    ach.isUnlocked ? 'text-white' : 'text-white/50'
                  ]"
                >
                  {{ ach.name }}
                </h3>
                <p class="text-xs text-white/50 mb-3 line-clamp-2 h-8">
                  {{ ach.description }}
                </p>
                <div
                  :class="[
                    'flex items-center justify-center gap-1 text-sm font-semibold',
                    ach.isUnlocked ? 'text-yellow-400' : 'text-white/30'
                  ]"
                >
                  <Icon name="ph:coins-fill" />
                  {{ ach.points }}
                </div>

                <div
                  v-if="ach.isUnlocked"
                  class="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <Icon name="ph:check" class="text-xs text-white" />
                </div>

                <div
                  v-if="ach.isUnlocked && ach.unlockedAt"
                  class="text-[10px] text-white/30 mt-2"
                >
                  {{ formatTime(ach.unlockedAt) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

useHead({
  title: '成就殿堂 - Neurosama 粉丝小说站'
})

const { toast } = useToast()

const categoryNames: Record<string, string> = {
  GENERAL: '综合成就',
  CREATION: '创作成就',
  READING: '阅读成就',
  SOCIAL: '社交成就',
  SPECIAL: '特殊成就',
}

const categoryIcons: Record<string, string> = {
  GENERAL: 'ph:calendar-check-fill',
  CREATION: 'ph:pen-nib-fill',
  READING: 'ph:book-open-fill',
  SOCIAL: 'ph:users-three-fill',
  SPECIAL: 'ph:crown-simple-fill',
}

const categoryBgClasses: Record<string, string> = {
  GENERAL: 'bg-blue-500/20 text-blue-400',
  CREATION: 'bg-neuro-primary/20 text-neuro-primary',
  READING: 'bg-emerald-500/20 text-emerald-400',
  SOCIAL: 'bg-cyan-500/20 text-cyan-400',
  SPECIAL: 'bg-yellow-500/20 text-yellow-400',
}

const refreshing = ref(false)

const queryForce = computed(() => {
  return {}
})

const { data, pending, refresh } = await useFetch(() => `/api/user/achievements${refreshing.value ? '?forceCheck=true' : ''}`)

const achievements = computed(() => data.value?.data?.achievements || [])
const achievementsByCategory = computed(() => data.value?.data?.groupedByCategory || {})
const stats = computed(() => data.value?.data?.stats || {})
const recentUnlocks = computed(() => data.value?.data?.recentUnlocks || [])

const remaining = computed(() => {
  const s = stats.value
  return (s?.total || 0) - (s?.unlocked || 0)
})

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function forceRefresh() {
  refreshing.value = true
  try {
    await refresh()
    toast('成就已刷新', 'success')
  } catch (e: any) {
    toast(e?.data?.message || '刷新失败', 'error')
  } finally {
    refreshing.value = false
  }
}
</script>

<style scoped>
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 107, 157, 0.2); }
  50% { box-shadow: 0 0 40px rgba(192, 132, 252, 0.4); }
}
.animate-pulse-glow {
  animation: pulse-glow 3s ease-in-out infinite;
}
</style>
