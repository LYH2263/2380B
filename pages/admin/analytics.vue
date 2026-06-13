<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">数据分析</h1>
      <div class="flex items-center gap-2">
        <select v-model="trendDays" class="input-field w-auto" @change="loadTrends">
          <option :value="7">最近7天</option>
          <option :value="30">最近30天</option>
          <option :value="90">最近90天</option>
        </select>
        <select v-model="topDays" class="input-field w-auto" @change="loadTopContent">
          <option :value="7">最近7天</option>
          <option :value="30">最近30天</option>
          <option :value="90">最近90天</option>
        </select>
      </div>
    </div>

    <div v-if="overviewPending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div v-for="i in 6" :key="i" class="card p-6 animate-pulse">
        <div class="h-4 bg-white/10 rounded w-24 mb-3" />
        <div class="h-8 bg-white/10 rounded w-32 mb-2" />
        <div class="h-4 bg-white/10 rounded w-20" />
      </div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div class="card p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-neuro-primary/20 flex items-center justify-center">
            <Icon name="ph:eye-fill" class="text-2xl text-neuro-primary" />
          </div>
          <div class="flex-1">
            <p class="text-white/60 text-sm">今日 PV</p>
            <div class="flex items-baseline gap-2">
              <p class="text-2xl font-bold">{{ overview?.todayPV.value.toLocaleString() }}</p>
              <GrowthBadge :value="overview?.todayPV.growth || 0" />
            </div>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-neuro-secondary/20 flex items-center justify-center">
            <Icon name="ph:users-fill" class="text-2xl text-neuro-secondary" />
          </div>
          <div class="flex-1">
            <p class="text-white/60 text-sm">今日 UV</p>
            <div class="flex items-baseline gap-2">
              <p class="text-2xl font-bold">{{ overview?.todayUV.value.toLocaleString() }}</p>
              <GrowthBadge :value="overview?.todayUV.growth || 0" />
            </div>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-neuro-accent/20 flex items-center justify-center">
            <Icon name="ph:fire-fill" class="text-2xl text-neuro-accent" />
          </div>
          <div class="flex-1">
            <p class="text-white/60 text-sm">本周活跃用户</p>
            <div class="flex items-baseline gap-2">
              <p class="text-2xl font-bold">{{ overview?.weekActiveUsers.value.toLocaleString() }}</p>
              <GrowthBadge :value="overview?.weekActiveUsers.growth || 0" />
            </div>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Icon name="ph:user-plus-fill" class="text-2xl text-green-500" />
          </div>
          <div class="flex-1">
            <p class="text-white/60 text-sm">今日新增用户</p>
            <div class="flex items-baseline gap-2">
              <p class="text-2xl font-bold">{{ overview?.newUsers.value.toLocaleString() }}</p>
              <GrowthBadge :value="overview?.newUsers.growth || 0" />
            </div>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Icon name="ph:book-fill" class="text-2xl text-blue-500" />
          </div>
          <div class="flex-1">
            <p class="text-white/60 text-sm">今日新增小说</p>
            <div class="flex items-baseline gap-2">
              <p class="text-2xl font-bold">{{ overview?.newNovels.value.toLocaleString() }}</p>
              <GrowthBadge :value="overview?.newNovels.growth || 0" />
            </div>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Icon name="ph:file-text-fill" class="text-2xl text-yellow-500" />
          </div>
          <div class="flex-1">
            <p class="text-white/60 text-sm">今日新增章节</p>
            <div class="flex items-baseline gap-2">
              <p class="text-2xl font-bold">{{ overview?.newChapters.value.toLocaleString() }}</p>
              <GrowthBadge :value="overview?.newChapters.growth || 0" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <div class="card p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Icon name="ph:trend-up" />
          PV/UV 趋势
        </h2>
        <div v-if="trendsPending" class="h-80 flex items-center justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-neuro-primary border-t-transparent" />
        </div>
        <LineChart v-else-if="trendData.length" :series="trendData" :x-labels="trendLabels" :height="300" />
        <div v-else class="h-80 flex items-center justify-center text-white/50">
          暂无数据
        </div>
      </div>

      <div class="card p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Icon name="ph:funnel" />
          用户行为漏斗
        </h2>
        <div v-if="funnelPending" class="h-80 flex items-center justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-neuro-primary border-t-transparent" />
        </div>
        <FunnelChart v-else-if="funnelData.length" :data="funnelData" :height="300" />
        <div v-else class="h-80 flex items-center justify-center text-white/50">
          暂无数据
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="card p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Icon name="ph:fire" />
          热门小说 Top 10
        </h2>
        <div v-if="topContentPending" class="space-y-3">
          <div v-for="i in 10" :key="i" class="h-12 bg-white/5 rounded animate-pulse" />
        </div>
        <div v-else-if="topNovels.length" class="space-y-3">
          <div
            v-for="(novel, idx) in topNovels"
            :key="novel.id"
            class="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition"
          >
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              :class="idx < 3 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-white/10 text-white/50'"
            >
              {{ idx + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ novel.title }}</p>
              <p class="text-sm text-white/50">{{ novel.author }}</p>
            </div>
            <div class="flex items-center gap-2 text-white/70">
              <Icon name="ph:eye" />
              <span>{{ novel.views.toLocaleString() }}</span>
            </div>
          </div>
        </div>
        <div v-else class="py-8 text-center text-white/50">
          暂无数据
        </div>
      </div>

      <div class="card p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Icon name="ph:file-text" />
          热门章节 Top 10
        </h2>
        <div v-if="topContentPending" class="space-y-3">
          <div v-for="i in 10" :key="i" class="h-12 bg-white/5 rounded animate-pulse" />
        </div>
        <div v-else-if="topChapters.length" class="space-y-3">
          <div
            v-for="(chapter, idx) in topChapters"
            :key="chapter.id"
            class="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition"
          >
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              :class="idx < 3 ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-white/10 text-white/50'"
            >
              {{ idx + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ chapter.title }}</p>
              <p class="text-sm text-white/50 truncate">{{ chapter.novelTitle }}</p>
            </div>
            <div class="text-right">
              <div class="flex items-center gap-1 text-white/70">
                <Icon name="ph:eye" class="text-sm" />
                <span class="text-sm">{{ chapter.views.toLocaleString() }}</span>
              </div>
              <div class="flex items-center gap-1 text-neuro-accent text-xs">
                <Icon name="ph:check-circle" />
                <span>{{ chapter.avgCompletionRate }}%</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-8 text-center text-white/50">
          暂无数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const trendDays = ref(30)
const topDays = ref(7)

const { data: overview, pending: overviewPending } = await useFetch('/api/admin/analytics/overview')

const { data: trendsData, pending: trendsPending, refresh: loadTrends } = await useFetch(
  () => `/api/admin/analytics/trends?days=${trendDays.value}`
)

const { data: funnelDataRaw, pending: funnelPending } = await useFetch('/api/admin/analytics/funnel')

const { data: topContentData, pending: topContentPending, refresh: loadTopContent } = await useFetch(
  () => `/api/admin/analytics/top-content?days=${topDays.value}`
)

const trendData = computed(() => {
  if (!trendsData.value?.trends) return []
  return [
    {
      name: 'PV',
      data: trendsData.value.trends.map((t: any) => ({
        value: t.pv,
        label: t.date.slice(5)
      }))
    },
    {
      name: 'UV',
      data: trendsData.value.trends.map((t: any) => ({
        value: t.uv,
        label: t.date.slice(5)
      }))
    }
  ]
})

const trendLabels = computed(() => {
  return trendsData.value?.trends?.map((t: any) => t.date.slice(5)) || []
})

const funnelData = computed(() => {
  return funnelDataRaw.value?.funnel || []
})

const topNovels = computed(() => {
  return topContentData.value?.topNovels || []
})

const topChapters = computed(() => {
  return topContentData.value?.topChapters || []
})

useHead({
  title: '数据分析 - 管理后台'
})
</script>
