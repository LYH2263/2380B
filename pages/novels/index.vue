<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-4">小说库</h1>

        <!-- Filters -->
        <div class="space-y-4">
          <!-- Search Row -->
          <div class="flex flex-wrap gap-3 items-start">
            <!-- Search Scope + Search Input -->
            <div class="flex-1 min-w-[280px] max-w-2xl flex gap-2">
              <div class="relative flex-1">
                <Icon
                  name="ph:magnifying-glass"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4"
                />
                <input
                  v-model="search"
                  type="text"
                  placeholder="搜索小说、章节内容...支持高级语法：\"精确短语\" -排除词 author:作者名"
                  class="input-field pl-10 pr-24"
                  @keyup.enter="handleSearch"
                />
                <button
                  v-if="search"
                  @click="clearSearch"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition p-1"
                >
                  <Icon name="ph:x-circle" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Status Filter -->
            <select v-model="status" class="input-field w-auto">
              <option value="">全部状态</option>
              <option value="ONGOING">连载中</option>
              <option value="COMPLETED">已完结</option>
              <option value="HIATUS">暂停更新</option>
            </select>

            <!-- Sort -->
            <select v-model="sort" class="input-field w-auto">
              <option value="latest">最新更新</option>
              <option value="popular">最多阅读</option>
              <option value="rating">最高评分</option>
            </select>
          </div>

          <!-- Search Scope Selector -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-white/50 text-sm">搜索范围：</span>
            <div class="flex items-center gap-1 p-1 bg-white/5 rounded-xl">
              <button
                v-for="option in scopeOptions"
                :key="option.value"
                @click="scope = option.value"
                :class="[
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                  scope === option.value
                    ? 'bg-neuro-primary text-white shadow-lg shadow-neuro-primary/30'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                ]"
              >
                <Icon :name="option.icon" class="w-3.5 h-3.5 inline-block mr-1.5" />
                {{ option.label }}
              </button>
            </div>

            <div
              v-if="searchMeta?.usedFallback"
              class="ml-2 flex items-center gap-1.5 text-xs text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-lg"
            >
              <Icon name="ph:warning" class="w-3.5 h-3.5" />
              全文搜索不可用，使用兼容模式
            </div>
          </div>

          <!-- Advanced Search Syntax Help -->
          <div v-if="search" class="flex flex-wrap items-center gap-3 text-xs text-white/40">
            <span>高级语法：</span>
            <code class="px-2 py-0.5 bg-white/10 rounded">"精确短语"</code>
            <code class="px-2 py-0.5 bg-white/10 rounded">-排除词</code>
            <code class="px-2 py-0.5 bg-white/10 rounded">author:作者名</code>
            <span v-if="searchMeta?.parsedQuery?.hasAdvancedSyntax" class="text-neuro-primary/70 flex items-center gap-1">
              <Icon name="ph:check-circle" class="w-3.5 h-3.5" />
              已启用高级搜索
            </span>
          </div>
        </div>

        <!-- Popular Tags -->
        <div class="mt-6">
          <div class="flex items-center gap-2 mb-3">
            <Icon name="ph:fire" class="text-orange-400 w-4 h-4" />
            <span class="text-sm font-medium text-white/70">热门标签</span>
          </div>
          <TagCloud
            :limit="30"
            :selected-tag="tag"
            @select="handleTagSelect"
          />
        </div>

        <!-- Active Tag -->
        <div v-if="tag" class="mt-4 flex items-center gap-2">
          <span class="text-white/70">当前标签:</span>
          <span class="px-3 py-1 bg-neuro-primary/20 border border-neuro-primary/50 rounded-full flex items-center gap-2">
            #{{ tag }}
            <button @click="tag = ''" class="hover:text-neuro-primary">
              <Icon name="ph:x" />
            </button>
          </span>
        </div>

        <!-- Search Results Summary -->
        <div v-if="search && !pending && pagination" class="mt-4 text-sm text-white/60 flex items-center gap-4">
          <span>
            找到 <span class="text-white font-medium">{{ pagination.total }}</span> 本小说
            <span v-if="totalHitsCount > 0">
              ，共 <span class="text-neuro-primary font-medium">{{ totalHitsCount }}</span> 处匹配
            </span>
          </span>
          <span v-if="searchMeta" class="text-white/40">
            范围：{{ getScopeLabel(searchMeta.scope) }}
          </span>
        </div>
      </div>

      <!-- Results -->
      <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <NovelCardSkeleton v-for="i in 8" :key="i" />
      </div>

      <div v-else-if="novels.length === 0" class="text-center py-20">
        <Icon name="ph:book-open" class="text-6xl text-white/30 mb-4" />
        <p class="text-xl text-white/50">暂无小说</p>
        <p class="text-white/30 mt-2">换个搜索条件试试？</p>
        <div v-if="search" class="mt-6 space-y-2 text-sm text-white/40">
          <p>提示：</p>
          <ul class="space-y-1 max-w-md mx-auto text-left">
            <li>· 尝试更短的关键词</li>
            <li>· 使用不同的搜索范围</li>
            <li>· 使用 "精确短语" 搜索更精准的内容</li>
            <li>· 用 -排除词 过滤不需要的结果</li>
          </ul>
        </div>
      </div>

      <template v-else>
        <div v-if="hasAnyHits" class="space-y-2">
          <SearchResultCard v-for="novel in novelsWithHits" :key="novel.novelId" :novel="novel" />
        </div>

        <div v-if="novelsWithoutHits.length > 0" class="mt-8">
          <h2 v-if="hasAnyHits" class="text-lg font-medium text-white/60 mb-4">
            其他匹配的小说
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <NovelCard v-for="novel in novelsWithoutHits" :key="novel.novelId" :novel="novel" />
          </div>
        </div>
      </template>

      <!-- Pagination -->
      <div v-if="pagination && pagination.totalPages > 1" class="mt-12 flex justify-center gap-2">
        <button
          @click="page = page - 1"
          :disabled="page <= 1"
          class="btn-secondary px-4 py-2 disabled:opacity-50"
        >
          <Icon name="ph:caret-left" />
        </button>

        <template v-for="p in displayPages" :key="p">
          <button
            v-if="p === '...'"
            disabled
            class="px-4 py-2 text-white/50"
          >
            ...
          </button>
          <button
            v-else
            @click="page = p as number"
            :class="[
              'px-4 py-2 rounded-xl transition',
              page === p ? 'bg-neuro-primary text-white' : 'hover:bg-white/10'
            ]"
          >
            {{ p }}
          </button>
        </template>

        <button
          @click="page = page + 1"
          :disabled="page >= pagination.totalPages"
          class="btn-secondary px-4 py-2 disabled:opacity-50"
        >
          <Icon name="ph:caret-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const scopeOptions = [
  { value: 'title', label: '仅标题', icon: 'ph:book-bookmark' },
  { value: 'title_desc', label: '标题+简介', icon: 'ph:file-text' },
  { value: 'full', label: '全文搜索', icon: 'ph:magnifying-glass-plus' }
]

const getScopeLabel = (scope: string) => {
  return scopeOptions.find(o => o.value === scope)?.label || scope
}

const page = ref(Number(route.query.page) || 1)
const search = ref((route.query.search as string) || '')
const tag = ref((route.query.tag as string) || '')
const status = ref((route.query.status as string) || '')
const sort = ref((route.query.sort as string) || 'latest')
const scope = ref((route.query.scope as string) || 'title_desc')

const { data, pending, refresh } = await useFetch('/api/novels', {
  query: computed(() => ({
    page: page.value,
    search: search.value,
    tag: tag.value,
    status: status.value,
    sort: sort.value,
    scope: scope.value,
    limit: 12
  })),
  watch: [page, tag, status, sort, scope]
})

const novels = computed(() => {
  const raw = data.value?.novels || []
  return raw.map((n: any) => ({
    id: n.novelId,
    novelId: n.novelId,
    title: n.title,
    description: n.description,
    cover: n.cover,
    status: n.status,
    tags: n.tags,
    viewCount: n.viewCount,
    avgRating: n.avgRating,
    totalHits: n.totalHits || 0,
    hits: n.hits || [],
    author: n.author,
    _count: n._count,
    isLiked: n.isLiked,
    isFavorited: n.isFavorited,
    isSubscribed: n.isSubscribed
  }))
})

const pagination = computed(() => data.value?.pagination)
const searchMeta = computed(() => data.value?.searchMeta)

const hasAnyHits = computed(() => novels.value.some(n => n.totalHits > 0))

const novelsWithHits = computed(() => novels.value.filter(n => n.totalHits > 0))
const novelsWithoutHits = computed(() => novels.value.filter(n => n.totalHits === 0))

const totalHitsCount = computed(() => novels.value.reduce((sum, n) => sum + (n.totalHits || 0), 0))

const displayPages = computed(() => {
  if (!pagination.value) return []
  const total = pagination.value.totalPages
  const current = page.value
  const pages: (number | string)[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i)
    }
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  return pages
})

const handleSearch = () => {
  page.value = 1
  refresh()
}

const clearSearch = () => {
  search.value = ''
  page.value = 1
  refresh()
}

const handleTagSelect = (tagItem: any) => {
  tag.value = tagItem.name
  page.value = 1
  refresh()
}

watch([page, search, tag, status, sort, scope], () => {
  const query: any = {}
  if (page.value > 1) query.page = page.value
  if (search.value) query.search = search.value
  if (tag.value) query.tag = tag.value
  if (status.value) query.status = status.value
  if (sort.value !== 'latest') query.sort = sort.value
  if (scope.value !== 'title_desc') query.scope = scope.value

  router.replace({ query })
}, { deep: true })

useHead({
  title: '小说库 - Neurosama 粉丝小说站'
})
</script>
