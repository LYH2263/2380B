<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold">我的数据</h1>
        <select v-model="overviewDays" class="input-field w-auto" @change="loadOverview">
          <option :value="7">最近7天</option>
          <option :value="30">最近30天</option>
          <option :value="90">最近90天</option>
        </select>
      </div>

      <div v-if="overviewPending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div v-for="i in 4" :key="i" class="card p-6 animate-pulse">
          <div class="h-4 bg-white/10 rounded w-24 mb-3" />
          <div class="h-8 bg-white/10 rounded w-32" />
        </div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="card p-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-neuro-primary/20 flex items-center justify-center">
              <Icon name="ph:book-open-fill" class="text-2xl text-neuro-primary" />
            </div>
            <div>
              <p class="text-white/60 text-sm">总阅读次数</p>
              <p class="text-2xl font-bold">{{ overview?.totalReads.toLocaleString() }}</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-neuro-secondary/20 flex items-center justify-center">
              <Icon name="ph:users-fill" class="text-2xl text-neuro-secondary" />
            </div>
            <div>
              <p class="text-white/60 text-sm">读者数</p>
              <p class="text-2xl font-bold">{{ overview?.totalReaders.toLocaleString() }}</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-neuro-accent/20 flex items-center justify-center">
              <Icon name="ph:check-circle-fill" class="text-2xl text-neuro-accent" />
            </div>
            <div>
              <p class="text-white/60 text-sm">平均完成率</p>
              <p class="text-2xl font-bold">{{ overview?.avgCompletionRate }}%</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Icon name="ph:clock-fill" class="text-2xl text-yellow-500" />
            </div>
            <div>
              <p class="text-white/60 text-sm">总阅读时长</p>
              <p class="text-2xl font-bold">{{ formatDuration(overview?.totalReadingTime || 0) }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div class="card p-6">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
            <Icon name="ph:trend-up" />
            阅读数据趋势
          </h2>
          <div v-if="overviewPending" class="h-80 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-neuro-primary border-t-transparent" />
          </div>
          <LineChart v-else-if="trendData.length" :series="trendData" :x-labels="trendLabels" :height="300" />
          <div v-else class="h-80 flex items-center justify-center text-white/50">
            暂无数据，发布小说后开始统计
          </div>
        </div>

        <div class="card p-6">
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
            <Icon name="ph:book" />
            作品列表
          </h2>
          <div v-if="overviewPending" class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-16 bg-white/5 rounded animate-pulse" />
          </div>
          <div v-else-if="novelList.length" class="space-y-3">
            <div
              v-for="novel in novelList"
              :key="novel.id"
              class="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition cursor-pointer"
              :class="{ 'bg-white/10': selectedNovelId === novel.id }"
              @click="selectNovel(novel.id)"
            >
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ novel.title }}</p>
                <div class="flex items-center gap-4 mt-1 text-sm text-white/50">
                  <span class="flex items-center gap-1">
                    <Icon name="ph:eye" class="text-xs" />
                    {{ novel.reads }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Icon name="ph:users" class="text-xs" />
                    {{ novel.readers }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Icon name="ph:check-circle" class="text-xs" />
                    {{ novel.avgCompletionRate }}%
                  </span>
                </div>
              </div>
              <Icon name="ph:caret-right" class="text-white/30" />
            </div>
          </div>
          <div v-else class="py-8 text-center text-white/50">
            暂无作品，<NuxtLink to="/novels/new" class="text-neuro-primary hover:underline">去发布</NuxtLink>
          </div>
        </div>
      </div>

      <div v-if="selectedNovelId" class="mb-8">
        <div class="card p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold flex items-center gap-2">
              <Icon name="ph:bar-chart" />
              章节对比 - {{ selectedNovel?.title }}
            </h2>
            <select v-model="chapterDays" class="input-field w-auto" @change="loadChapters">
              <option :value="7">最近7天</option>
              <option :value="30">最近30天</option>
              <option :value="90">最近90天</option>
            </select>
          </div>

          <div v-if="chaptersPending" class="h-80 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-neuro-primary border-t-transparent" />
          </div>
          <div v-else-if="chapterChartData.length" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 class="text-sm font-medium text-white/60 mb-3">阅读量</h3>
              <BarChart :data="chapterReadsData" :height="300" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-white/60 mb-3">完成率</h3>
              <BarChart :data="chapterCompletionData" :height="300" />
            </div>
          </div>
          <div v-else class="h-80 flex items-center justify-center text-white/50">
            暂无章节数据
          </div>
        </div>
      </div>

      <div class="card p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Icon name="ph:chart-line" />
          读者留存曲线
        </h2>
        <div v-if="retentionPending" class="h-80 flex items-center justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-neuro-primary border-t-transparent" />
        </div>
        <LineChart v-else-if="retentionData.length" :series="retentionChartData" :x-labels="retentionLabels" :height="300" :show-area="true" />
        <div v-else class="h-80 flex items-center justify-center text-white/50">
          暂无留存数据
        </div>
        <div v-if="retentionData.length" class="mt-4 grid grid-cols-3 gap-4">
          <div class="text-center p-4 bg-white/5 rounded-xl">
            <p class="text-2xl font-bold text-neuro-primary">{{ latestRetention?.day1 }}%</p>
            <p class="text-sm text-white/50">次日留存</p>
          </div>
          <div class="text-center p-4 bg-white/5 rounded-xl">
            <p class="text-2xl font-bold text-neuro-secondary">{{ latestRetention?.day7 }}%</p>
            <p class="text-sm text-white/50">7日留存</p>
          </div>
          <div class="text-center p-4 bg-white/5 rounded-xl">
            <p class="text-2xl font-bold text-neuro-accent">{{ latestRetention?.day14 }}%</p>
            <p class="text-sm text-white/50">14日留存</p>
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

const { user } = useAuth()

const overviewDays = ref(30)
const chapterDays = ref(30)
const selectedNovelId = ref<number | null>(null)

const { data: overviewData, pending: overviewPending, refresh: loadOverview } = await useFetch(
  () => `/api/author/analytics/overview?days=${overviewDays.value}`
)

const { data: chaptersData, pending: chaptersPending, refresh: loadChapters } = await useFetch(
  () => selectedNovelId.value ? `/api/author/analytics/chapters?novelId=${selectedNovelId.value}&days=${chapterDays.value}` : null
)

const { data: retentionDataRaw, pending: retentionPending } = await useFetch(
  '/api/author/analytics/retention'
)

const overview = computed(() => overviewData.value)

const novelList = computed(() => overviewData.value?.novels || [])

const selectedNovel = computed(() => {
  if (!selectedNovelId.value) return null
  return novelList.value.find(n => n.id === selectedNovelId.value)
})

const trendData = computed(() => {
  if (!overviewData.value?.trends) return []
  return [
    {
      name: '阅读次数',
      data: overviewData.value.trends.map((t: any) => ({
        value: t.reads,
        label: t.date.slice(5)
      }))
    },
    {
      name: '读者数',
      data: overviewData.value.trends.map((t: any) => ({
        value: t.readers,
        label: t.date.slice(5)
      }))
    }
  ]
})

const trendLabels = computed(() => {
  return overviewData.value?.trends?.map((t: any) => t.date.slice(5)) || []
})

const chapterChartData = computed(() => chaptersData.value?.chapters || [])

const chapterReadsData = computed(() => {
  return chapterChartData.value.map((c: any) => ({
    label: `第${c.order}章`,
    value: c.reads
  }))
})

const chapterCompletionData = computed(() => {
  return chapterChartData.value.map((c: any) => ({
    label: `第${c.order}章`,
    value: c.avgCompletionRate
  }))
})

const retentionData = computed(() => retentionDataRaw.value?.retention || [])

const retentionChartData = computed(() => {
  if (!retentionData.value.length) return []
  return [
    {
      name: '次日留存',
      data: retentionData.value.filter((r: any) => r.total > 0).map((r: any) => ({
        value: r.day1,
        label: r.date.slice(5)
      }))
    },
    {
      name: '7日留存',
      data: retentionData.value.filter((r: any) => r.total > 0).map((r: any) => ({
        value: r.day7,
        label: r.date.slice(5)
      }))
    }
  ]
})

const retentionLabels = computed(() => {
  return retentionData.value.filter((r: any) => r.total > 0).map((r: any) => r.date.slice(5)) || []
})

const latestRetention = computed(() => {
  const valid = retentionData.value.filter((r: any) => r.total > 0)
  return valid[valid.length - 1] || null
})

const selectNovel = (novelId: number) => {
  selectedNovelId.value = selectedNovelId.value === novelId ? null : novelId
  if (selectedNovelId.value) {
    nextTick(() => {
      loadChapters()
    })
  }
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

watch(() => novelList.value, (novels) => {
  if (novels.length > 0 && !selectedNovelId.value) {
    selectedNovelId.value = novels[0].id
  }
}, { immediate: true })

useHead({
  title: '我的数据 - 作者中心'
})
</script>
