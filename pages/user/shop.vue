<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4 max-w-6xl">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div class="flex items-center gap-3">
          <Icon name="ph:storefront-fill" class="text-3xl text-neuro-accent" />
          <h1 class="text-3xl font-bold">积分商城</h1>
        </div>

        <div v-if="user" class="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-5 py-3">
          <Icon name="ph:coins-fill" class="text-yellow-400 text-xl" />
          <div>
            <div class="text-xs text-white/50">我的积分</div>
            <div class="text-xl font-bold text-yellow-400">{{ user.points }}</div>
          </div>
        </div>
      </div>

      <div class="card p-6 mb-6">
        <div class="flex flex-wrap gap-2">
          <button
            @click="activeCategory = ''"
            :class="[
              'px-4 py-2 rounded-xl text-sm font-medium transition',
              activeCategory === ''
                ? 'bg-gradient-to-r from-neuro-primary to-neuro-secondary text-white'
                : 'bg-white/10 hover:bg-white/20 text-white/70'
            ]"
          >
            全部
          </button>
          <button
            v-for="(name, key) in shopData?.categoryNames || {}"
            :key="key"
            @click="activeCategory = key"
            :class="[
              'px-4 py-2 rounded-xl text-sm font-medium transition',
              activeCategory === key
                ? 'bg-gradient-to-r from-neuro-primary to-neuro-secondary text-white'
                : 'bg-white/10 hover:bg-white/20 text-white/70'
            ]"
          >
            {{ name }}
          </button>
        </div>
      </div>

      <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="i in 8" :key="i" class="card p-6 h-72 animate-pulse">
          <div class="w-full h-32 bg-white/10 rounded-xl mb-4" />
          <div class="h-6 bg-white/10 rounded w-3/4 mb-2" />
          <div class="h-4 bg-white/10 rounded w-full mb-2" />
          <div class="h-4 bg-white/10 rounded w-2/3 mb-6" />
          <div class="h-10 bg-white/10 rounded-xl" />
        </div>
      </div>

      <template v-else>
        <div v-if="filteredItems.length === 0" class="card p-16 text-center">
          <Icon name="ph:package" class="text-6xl text-white/30 mb-4" />
          <p class="text-xl text-white/50">该分类暂无商品</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="card p-6 group hover:scale-[1.02]"
          >
            <div
              :class="[
                'w-full h-32 rounded-xl mb-4 flex items-center justify-center text-6xl relative overflow-hidden',
                getCategoryBgClass(item.category)
              ]"
            >
              <span class="drop-shadow-lg">{{ getItemIcon(item) }}</span>

              <div
                v-if="item.stock !== null && item.stock !== undefined"
                class="absolute top-2 right-2 bg-red-500/90 text-white text-xs px-2 py-1 rounded-full font-semibold"
              >
                仅剩 {{ item.stock }}
              </div>

              <div
                v-if="item.durationDays"
                class="absolute bottom-2 left-2 bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded-full"
              >
                {{ item.durationDays }}天
              </div>
              <div
                v-else
                class="absolute bottom-2 left-2 bg-emerald-500/80 backdrop-blur text-white text-xs px-2 py-1 rounded-full"
              >
                永久
              </div>
            </div>

            <h3 class="font-bold text-lg mb-2 group-hover:text-neuro-primary transition">{{ item.name }}</h3>
            <p class="text-sm text-white/60 mb-4 line-clamp-2 h-10">{{ item.description }}</p>

            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-1">
                <Icon name="ph:coins-fill" class="text-yellow-400" />
                <span class="text-xl font-bold text-yellow-400">{{ item.price }}</span>
              </div>
              <div class="text-xs text-white/40 flex items-center gap-1">
                <Icon name="ph:users-three-fill" />
                已售 {{ item.soldCount }}
              </div>
            </div>

            <button
              @click="redeemItem(item)"
              :disabled="redeeming === item.id || !user || user.points < item.price || (item.stock !== null && item.stock !== undefined && item.stock <= 0)"
              :class="[
                'w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2',
                user && user.points >= item.price && (item.stock === null || item.stock === undefined || item.stock > 0)
                  ? 'bg-gradient-to-r from-neuro-primary to-neuro-secondary text-white hover:shadow-lg hover:shadow-neuro-primary/30 hover:scale-[1.02] disabled:opacity-50'
                  : 'bg-white/10 text-white/50 cursor-not-allowed'
              ]"
            >
              <Icon v-if="redeeming === item.id" name="ph:spinner-gap" class="animate-spin" />
              <Icon v-else name="ph:shopping-bag-fill" />
              <template v-if="redeeming === item.id">兑换中...</template>
              <template v-else-if="!user">请先登录</template>
              <template v-else-if="user.points < item.price">积分不足</template>
              <template v-else-if="item.stock !== null && item.stock !== undefined && item.stock <= 0">已售罄</template>
              <template v-else>立即兑换</template>
            </button>
          </div>
        </div>
      </template>

      <div class="card p-6 mt-8">
        <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
          <Icon name="ph:archive-fill" class="text-neuro-secondary" />
          我的物品
        </h2>

        <div v-if="itemsPending" class="text-center py-8">
          <Icon name="ph:spinner-gap" class="text-2xl text-neuro-primary animate-spin" />
        </div>
        <div v-else-if="userItems.length === 0" class="text-center py-12 text-white/50">
          <Icon name="ph:gift-open" class="text-4xl mb-2" />
          <p>还没有兑换任何物品，快去积分商城看看吧！</p>
        </div>
        <div v-else>
          <div class="flex gap-2 mb-4 flex-wrap">
            <span
              v-for="(name, key) in itemsData?.categoryNames || {}"
              :key="key"
              class="text-sm bg-white/5 px-3 py-1.5 rounded-lg text-white/70"
            >
              {{ name }}: {{ (itemsData?.groupedByCategory?.[key] || []).length }}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div
              v-for="userItem in activeItems"
              :key="userItem.id"
              class="bg-white/5 rounded-xl p-4 text-center hover:bg-white/10 transition"
            >
              <div
                :class="[
                  'w-16 h-16 mx-auto rounded-xl flex items-center justify-center text-3xl mb-2',
                  getCategoryBgClass(userItem.shopItem?.category)
                ]"
              >
                {{ getItemIcon(userItem.shopItem) }}
              </div>
              <div class="font-medium text-sm mb-1 truncate">{{ userItem.shopItem?.name }}</div>
              <div
                v-if="userItem.expiresAt"
                :class="[
                  'text-xs',
                  new Date(userItem.expiresAt) > new Date() ? 'text-white/50' : 'text-red-400'
                ]"
              >
                {{ new Date(userItem.expiresAt) > new Date()
                  ? '有效期至 ' + formatDate(userItem.expiresAt)
                  : '已过期'
                }}
              </div>
              <div v-else class="text-xs text-emerald-400">永久有效</div>
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

useHead({
  title: '积分商城 - Neurosama 粉丝小说站'
})

const { user } = useAuth()
const { toast } = useToast()

const activeCategory = ref('')
const redeeming = ref<number | null>(null)

const { data, pending, refresh } = await useFetch('/api/shop')
const shopData = computed(() => data.value?.data as any)
const allItems = computed(() => shopData.value?.items || [])

const filteredItems = computed(() => {
  const items = allItems.value as any[]
  if (!activeCategory.value) return items
  return items.filter(i => i.category === activeCategory.value)
})

const itemsData = ref<any>(null)
const itemsPending = ref(false)
const userItems = computed(() => itemsData.value?.allItems || [])
const activeItems = computed(() => itemsData.value?.activeItems || [])

function getCategoryBgClass(category: string) {
  const cls: Record<string, string> = {
    AVATAR_FRAME: 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/30',
    NICKNAME_COLOR: 'bg-gradient-to-br from-blue-500/30 to-cyan-500/20 border border-blue-500/30',
    AD_FREE: 'bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-500/30',
    BADGE: 'bg-gradient-to-br from-neuro-primary/30 to-neuro-secondary/20 border border-neuro-primary/30',
    OTHER: 'bg-gradient-to-br from-slate-500/30 to-slate-600/20 border border-slate-500/30',
  }
  return cls[category] || cls.OTHER
}

function getItemIcon(item: any) {
  if (!item) return '🎁'
  if (item.effectValue === 'bronze') return '🥉'
  if (item.effectValue === 'silver') return '🥈'
  if (item.effectValue === 'gold') return '🥇'
  if (item.effectValue === 'diamond') return '💎'
  if (item.effectValue === 'rainbow') return '🌈'
  if (item.category === 'NICKNAME_COLOR') return '🎨'
  if (item.category === 'AD_FREE') return '🚫'
  if (item.category === 'BADGE') return '🎖️'
  return '🎁'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

async function loadUserItems() {
  itemsPending.value = true
  try {
    const res = await $fetch('/api/user/items')
    itemsData.value = (res as any).data
  } catch (e: any) {
    console.error('Failed to load user items', e)
  } finally {
    itemsPending.value = false
  }
}

async function redeemItem(item: any) {
  if (!user.value) {
    toast('请先登录', 'error')
    navigateTo('/auth/login')
    return
  }
  if ((user.value as any).points < item.price) {
    toast('积分不足', 'warning')
    return
  }
  const confirmMsg = `确定使用 ${item.price} 积分兑换「${item.name}」吗？`
  if (!confirm(confirmMsg)) return

  redeeming.value = item.id
  try {
    const res: any = await $fetch('/api/shop/redeem', {
      method: 'POST',
      body: { shopItemId: item.id }
    })
    if (res.success) {
      toast(`兑换成功！已获得「${item.name}」`, 'success')
      await refresh()
      await loadUserItems()
      const { fetchUser } = useAuth()
      await fetchUser()
    }
  } catch (e: any) {
    toast(e?.data?.message || '兑换失败', 'error')
  } finally {
    redeeming.value = null
  }
}

onMounted(() => {
  loadUserItems()
})
</script>
