<template>
  <div class="card p-5 mb-6 overflow-hidden">
    <div class="flex gap-4">
      <NuxtLink
        :to="`/novels/${novel.novelId}`"
        class="flex-shrink-0 w-24 h-32 md:w-28 md:h-40 overflow-hidden rounded-xl bg-white/5 group"
      >
        <img
          :src="novel.cover || defaultCover"
          :alt="stripHighlight(novel.title)"
          class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </NuxtLink>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-3 mb-2">
          <NuxtLink
            :to="`/novels/${novel.novelId}`"
            class="group"
          >
            <h3 class="text-lg md:text-xl font-bold group-hover:text-neuro-primary transition line-clamp-1">
              <HighlightedText :text="novel.title" />
            </h3>
          </NuxtLink>

          <div
            v-if="novel.totalHits > 0"
            class="flex-shrink-0 px-2.5 py-1 bg-neuro-primary/20 text-neuro-primary rounded-lg text-xs font-medium whitespace-nowrap"
          >
            在本书中找到 {{ novel.totalHits }} 处
          </div>
        </div>

        <div class="flex items-center gap-3 text-sm text-white/50 mb-2 flex-wrap">
          <NuxtLink
            v-if="novel.author"
            :to="`/user/${novel.author.username}`"
            class="flex items-center gap-1.5 hover:text-neuro-primary transition"
          >
            <img
              :src="novel.author.avatar || defaultAvatar"
              :alt="novel.author.username"
              class="w-4 h-4 rounded-full"
            />
            <span>{{ novel.author.username }}</span>
          </NuxtLink>

          <span
            :class="[
              'px-2 py-0.5 rounded text-xs',
              statusClasses[novel.status as keyof typeof statusClasses]
            ]"
          >
            {{ statusLabels[novel.status as keyof typeof statusLabels] }}
          </span>

          <span class="flex items-center gap-1">
            <Icon name="ph:eye" class="w-3.5 h-3.5" />
            {{ formatNumber(novel.viewCount) }}
          </span>

          <span v-if="novel.avgRating" class="flex items-center gap-1">
            <Icon name="ph:star-fill" class="w-3.5 h-3.5 text-yellow-400" />
            {{ novel.avgRating }}
          </span>

          <span v-if="novel._count?.chapters" class="flex items-center gap-1">
            <Icon name="ph:book-open" class="w-3.5 h-3.5" />
            {{ novel._count.chapters }} 章
          </span>
        </div>

        <div class="flex flex-wrap gap-1 mb-3">
          <span
            v-for="tag in novel.tags?.slice(0, 4)"
            :key="tag"
            class="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/70"
          >
            #{{ tag }}
          </span>
        </div>

        <p class="text-sm text-white/60 line-clamp-2 mb-3">
          {{ novel.description }}
        </p>

        <div v-if="novel.totalHits > 0 && novel.hits.length > 0" class="space-y-2">
          <div
            v-for="(hit, idx) in displayedHits"
            :key="idx"
            class="group"
          >
            <div
              v-if="hit.type === 'chapter_content' || hit.type === 'chapter_title'"
              class="flex items-start gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
              @click="navigateToHit(hit)"
            >
              <div class="flex-shrink-0 mt-0.5">
                <Icon
                  :name="hit.type === 'chapter_title' ? 'ph:hash' : 'ph:quotes'"
                  class="w-4 h-4 text-neuro-primary/60"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs text-neuro-primary/80 mb-1 flex items-center gap-2">
                  <span>第 {{ hit.chapterOrder }} 章</span>
                  <span class="text-white/30">·</span>
                  <span class="text-white/50">{{ hit.chapterTitle }}</span>
                </div>
                <div class="text-sm text-white/80 leading-relaxed">
                  <HighlightedText :text="hit.snippet" />
                </div>
              </div>
              <Icon
                name="ph:arrow-up-right"
                class="flex-shrink-0 w-4 h-4 text-white/30 group-hover:text-neuro-primary transition mt-0.5"
              />
            </div>

            <div
              v-else-if="hit.type === 'description'"
              class="flex items-start gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
              @click="navigateToNovel"
            >
              <div class="flex-shrink-0 mt-0.5">
                <Icon name="ph:file-text" class="w-4 h-4 text-blue-400/60" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs text-blue-400/80 mb-1">简介</div>
                <div class="text-sm text-white/80 leading-relaxed">
                  <HighlightedText :text="hit.snippet" />
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex items-start gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
              @click="navigateToNovel"
            >
              <div class="flex-shrink-0 mt-0.5">
                <Icon name="ph:book-bookmark" class="w-4 h-4 text-purple-400/60" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs text-purple-400/80 mb-1">标题</div>
                <div class="text-sm text-white/80 leading-relaxed">
                  <HighlightedText :text="hit.snippet" />
                </div>
              </div>
            </div>
          </div>

          <button
            v-if="novel.hits.length > maxInitialHits"
            @click="showAllHits = !showAllHits"
            class="w-full py-2 text-sm text-neuro-primary hover:text-neuro-primary/80 hover:bg-neuro-primary/10 rounded-xl transition flex items-center justify-center gap-1"
          >
            <template v-if="showAllHits">
              <Icon name="ph:caret-up" class="w-4 h-4" />
              收起结果
            </template>
            <template v-else>
              <Icon name="ph:caret-down" class="w-4 h-4" />
              展开全部 {{ novel.hits.length }} 处命中
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchHit, AggregatedSearchResult } from '~/server/utils/searchService'

interface NovelResult extends AggregatedSearchResult {}

const props = defineProps<{
  novel: NovelResult
}>()

const defaultCover = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'
const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
const maxInitialHits = 3

const showAllHits = ref(false)

const displayedHits = computed(() => {
  if (showAllHits.value) return props.novel.hits
  return props.novel.hits.slice(0, maxInitialHits)
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

const formatNumber = (num: number) => {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

const stripHighlight = (text: string) => {
  return text
    .replace(/\|\|\|HIGHLIGHT_START\|\|\|/g, '')
    .replace(/\|\|\|HIGHLIGHT_END\|\|\|/g, '')
}

const navigateToNovel = () => {
  navigateTo(`/novels/${props.novel.novelId}`)
}

const navigateToHit = (hit: SearchHit) => {
  if (!hit.chapterId) {
    navigateToNovel()
    return
  }

  let hash = ''
  if (hit.startOffset !== undefined) {
    hash = `#offset=${hit.startOffset}`
  }

  navigateTo(`/novels/${props.novel.novelId}/chapters/${hit.chapterId}${hash}`)
}
</script>
