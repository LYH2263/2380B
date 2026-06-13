<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4 max-w-5xl">
      <div class="flex items-center gap-3 mb-8">
        <Icon name="ph:calendar-check-fill" class="text-3xl text-neuro-primary" />
        <h1 class="text-3xl font-bold">每日签到</h1>
      </div>

      <div v-if="pending" class="card p-8 text-center">
        <Icon name="ph:spinner-gap" class="text-4xl text-neuro-primary animate-spin mx-auto mb-4" />
        <p class="text-white/60">加载中...</p>
      </div>

      <template v-else-if="checkinData">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 用户信息与等级卡片 -->
          <div class="card p-6">
            <div class="flex items-center gap-4 mb-6">
              <div class="relative">
                <img
                  :src="checkinData.user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                  class="w-16 h-16 rounded-full border-2 border-neuro-primary"
                />
                <div
                  class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-neuro-primary to-neuro-secondary flex items-center justify-center text-xs font-bold border-2 border-slate-900"
                >
                  Lv{{ checkinData.user.level }}
                </div>
              </div>
              <div>
                <div class="font-bold text-lg">{{ checkinData.user.username }}</div>
                <div class="text-sm text-neuro-primary">{{ checkinData.user.levelName }}</div>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-white/60">等级进度</span>
                  <span class="text-neuro-accent">{{ checkinData.user.levelProgress.current }}/{{ checkinData.user.levelProgress.required }} 积分</span>
                </div>
                <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-neuro-primary to-neuro-secondary rounded-full transition-all duration-500"
                    :style="{ width: checkinData.user.levelProgress.percent + '%' }"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="bg-white/5 rounded-xl p-3 text-center">
                  <div class="text-2xl font-bold text-neuro-accent">{{ checkinData.user.points }}</div>
                  <div class="text-xs text-white/50 mt-1">可用积分</div>
                </div>
                <div class="bg-white/5 rounded-xl p-3 text-center">
                  <div class="text-2xl font-bold text-neuro-primary">{{ checkinData.user.totalPoints }}</div>
                  <div class="text-xs text-white/50 mt-1">累计积分</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 签到统计卡片 -->
          <div class="card p-6">
            <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
              <Icon name="ph:chart-line-up" class="text-neuro-secondary" />
              签到统计
            </h2>

            <div class="grid grid-cols-2 gap-4 mb-6">
              <div class="bg-gradient-to-br from-neuro-primary/20 to-neuro-primary/5 rounded-xl p-4 text-center border border-neuro-primary/30">
                <div class="text-5xl font-bold text-neuro-primary mb-2">
                  {{ checkinData.consecutiveDays }}
                </div>
                <div class="text-sm text-white/70 flex items-center justify-center gap-1">
                  <Icon name="ph:flame-fill" class="text-orange-400" />
                  连续签到天数
                </div>
              </div>
              <div class="bg-gradient-to-br from-neuro-secondary/20 to-neuro-secondary/5 rounded-xl p-4 text-center border border-neuro-secondary/30">
                <div class="text-5xl font-bold text-neuro-secondary mb-2">
                  {{ checkinData.totalCheckInDays }}
                </div>
                <div class="text-sm text-white/70 flex items-center justify-center gap-1">
                  <Icon name="ph:calendar-dots" />
                  累计签到天数
                </div>
              </div>
            </div>

            <div class="bg-white/5 rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <span class="text-white/70">{{ checkinData.monthInfo.monthName }}</span>
                <span
                  v-if="checkinData.hasCheckedInToday"
                  class="text-sm text-green-400 flex items-center gap-1"
                >
                  <Icon name="ph:check-circle-fill" />
                  今日已签到
                </span>
                <span v-else class="text-sm text-neuro-accent">
                  今日待签到 +{{ checkinData.nextReward }}积分
                </span>
              </div>

              <button
                v-if="!checkinData.hasCheckedInToday"
                @click="doCheckin"
                :disabled="checkingIn"
                class="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2"
              >
                <Icon v-if="!checkingIn" name="ph:hand-tap-fill" />
                <Icon v-else name="ph:spinner-gap" class="animate-spin" />
                {{ checkingIn ? '签到中...' : '立即签到' }}
              </button>
              <div
                v-else
                class="w-full py-4 bg-green-500/20 border border-green-500/40 rounded-xl text-center text-green-400 font-semibold flex items-center justify-center gap-2"
              >
                <Icon name="ph:check-circle-fill" class="text-xl" />
                签到成功！获得 {{ checkinData.todayReward }} 积分
              </div>
            </div>
          </div>

          <!-- 奖励规则卡片 -->
          <div class="card p-6">
            <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
              <Icon name="ph:gift-fill" class="text-neuro-accent" />
              签到奖励
            </h2>

            <div class="space-y-2 mb-6">
              <div
                v-for="(rule, index) in checkinData.rewardRules"
                :key="index"
                :class="[
                  'flex items-center justify-between p-3 rounded-xl transition',
                  (index + 1) <= getCurrentRewardIndex
                    ? 'bg-gradient-to-r from-neuro-primary/20 to-transparent border border-neuro-primary/30'
                    : 'bg-white/5'
                ]"
              >
                <div class="flex items-center gap-3">
                  <div
                    :class="[
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      (index + 1) <= getCurrentRewardIndex
                        ? 'bg-neuro-primary text-white'
                        : 'bg-white/10 text-white/50'
                    ]"
                  >
                    <Icon v-if="(index + 1) <= getCurrentRewardIndex" name="ph:check" class="text-sm" />
                    <span v-else>{{ rule.day }}</span>
                  </div>
                  <span :class="(index + 1) <= getCurrentRewardIndex ? 'text-white' : 'text-white/70'">
                    {{ rule.label }}
                  </span>
                </div>
                <span
                  :class="[
                    'font-bold',
                    (index + 1) <= getCurrentRewardIndex ? 'text-neuro-primary' : 'text-white/50'
                  ]"
                >
                  +{{ rule.points }}
                </span>
              </div>
            </div>

            <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div class="flex items-start gap-2 text-sm">
                <Icon name="ph:info" class="text-amber-400 mt-0.5 flex-shrink-0" />
                <div class="text-white/70">
                  <p class="mb-1">补签说明：</p>
                  <p>• 补签需消耗 <span class="text-amber-400 font-semibold">{{ checkinData.retroCost }}</span> 积分/次</p>
                  <p>• 仅可补签最近30天内的日期</p>
                  <p>• 点击日历中未签到的日期可进行补签</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 日历区域 -->
        <div class="card p-6 mt-6">
          <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
            <Icon name="ph:calendar-blank" class="text-neuro-primary" />
            {{ checkinData.monthInfo.monthName }} 签到日历
          </h2>

          <div class="grid grid-cols-7 gap-2 mb-4">
            <div
              v-for="day in weekDays"
              :key="day"
              class="text-center text-sm font-semibold text-white/50 py-2"
            >
              {{ day }}
            </div>
          </div>

          <div class="grid grid-cols-7 gap-2">
            <div
              v-for="(cell, idx) in calendarCells"
              :key="idx"
              :class="[
                'aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium cursor-pointer transition-all relative group',
                cell.isToday ? 'ring-2 ring-neuro-primary' : '',
                cell.isCheckedIn && !cell.isRetro
                  ? 'bg-gradient-to-br from-neuro-primary to-neuro-secondary text-white shadow-lg shadow-neuro-primary/30'
                  : '',
                cell.isCheckedIn && cell.isRetro
                  ? 'bg-gradient-to-br from-amber-500/70 to-orange-500/70 text-white'
                  : '',
                !cell.isCheckedIn && !cell.isEmpty && !cell.isFuture
                  ? 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 hover:border-neuro-primary/50'
                  : '',
                cell.isFuture ? 'bg-white/[0.02] text-white/20' : '',
                cell.isEmpty ? '' : ''
              ]"
              @click="cell.canRetro && !cell.isCheckedIn && handleRetro(cell)"
            >
              <span>{{ cell.day }}</span>
              <span
                v-if="cell.isCheckedIn"
                class="text-[10px] mt-0.5 opacity-80"
              >
                {{ cell.isRetro ? '补签' : '已签' }}
              </span>
              <span
                v-if="cell.canRetro && !cell.isCheckedIn"
                class="absolute inset-0 rounded-xl bg-neuro-primary/0 group-hover:bg-neuro-primary/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              >
                <span class="text-xs font-semibold text-neuro-primary bg-white/90 px-2 py-0.5 rounded-full">
                  -{{ checkinData.retroCost }}补签
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- 积分流水 -->
        <div class="card p-6 mt-6">
          <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
            <Icon name="ph:coins-fill" class="text-yellow-400" />
            积分流水记录
          </h2>

          <div v-if="recordsPending" class="text-center py-8">
            <Icon name="ph:spinner-gap" class="text-2xl text-neuro-primary animate-spin" />
          </div>
          <div v-else-if="records.length === 0" class="text-center py-12 text-white/50">
            <Icon name="ph:receipt-x" class="text-4xl mb-2" />
            <p>暂无积分记录</p>
          </div>
          <div v-else class="divide-y divide-white/10">
            <div
              v-for="record in records"
              :key="record.id"
              class="flex items-center justify-between py-3"
            >
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    record.points > 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  ]"
                >
                  <Icon :name="record.points > 0 ? 'ph:arrow-fat-down-fill' : 'ph:arrow-fat-up-fill'" />
                </div>
                <div>
                  <div class="font-medium">{{ sourceLabels[record.source] || record.source }}</div>
                  <div class="text-xs text-white/50">{{ record.description || '无描述' }}</div>
                  <div class="text-xs text-white/40 mt-0.5">{{ formatTime(record.createdAt) }}</div>
                </div>
              </div>
              <div
                :class="[
                  'font-bold text-lg',
                  record.points > 0 ? 'text-green-400' : 'text-red-400'
                ]"
              >
                {{ record.points > 0 ? '+' : '' }}{{ record.points }}
              </div>
            </div>
          </div>

          <div v-if="pagination && pagination.totalPages > 1" class="flex justify-center gap-2 mt-6">
            <button
              @click="loadPage(currentPage - 1)"
              :disabled="currentPage <= 1 || loadingRecords"
              class="btn-secondary py-2 px-4 text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <span class="py-2 px-4 text-white/50">
              {{ currentPage }} / {{ pagination.totalPages }}
            </span>
            <button
              @click="loadPage(currentPage + 1)"
              :disabled="currentPage >= pagination.totalPages || loadingRecords"
              class="btn-secondary py-2 px-4 text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </template>

      <!-- 成就解锁弹窗 -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <div
          v-if="newAchievements.length > 0"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          @click="closeAchievementModal"
        >
          <div
            class="card p-8 max-w-md w-full text-center animate-bounce-in"
            @click.stop
          >
            <div class="text-6xl mb-4 animate-glow rounded-full inline-block p-4">
              {{ newAchievements[0]?.icon || '🏆' }}
            </div>
            <h2 class="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-neuro-primary to-neuro-secondary">
              成就解锁！
            </h2>
            <div class="text-xl font-bold mb-2">{{ newAchievements[0]?.name }}</div>
            <p class="text-white/60 mb-4">{{ newAchievements[0]?.description }}</p>
            <div class="text-neuro-accent font-bold mb-6">
              +{{ newAchievements[0]?.points || 0 }} 积分
            </div>

            <div v-if="newAchievements.length > 1" class="mb-6">
              <div class="text-sm text-white/50 mb-2">同时解锁的其他成就：</div>
              <div class="flex flex-wrap justify-center gap-2">
                <span
                  v-for="(ach, i) in newAchievements.slice(1)"
                  :key="i"
                  class="bg-white/10 rounded-lg px-3 py-1 text-sm"
                >
                  {{ ach.icon }} {{ ach.name }}
                </span>
              </div>
            </div>

            <button @click="closeAchievementModal" class="btn-primary w-full">
              太棒了！
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

useHead({
  title: '每日签到 - Neurosama 粉丝小说站'
})

const { toast } = useToast()

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const sourceLabels: Record<string, string> = {
  CHECKIN: '每日签到',
  CHECKIN_BONUS: '签到奖励',
  CREATE_NOVEL: '发布小说',
  PUBLISH_CHAPTER: '发布章节',
  COMMENT: '发表评论',
  RATING: '作品评分',
  INVITE_USER: '邀请用户',
  NOVEL_FAVORITED: '作品被收藏',
  NOVEL_LIKED: '作品被点赞',
  REDEEM: '积分兑换',
  RETRO_CHECKIN: '补签扣除',
  SYSTEM: '系统奖励',
}

interface CheckinCalendarCell {
  day: number
  date: string
  isCheckedIn: boolean
  isRetro: boolean
  isToday: boolean
  isFuture: boolean
  isEmpty: boolean
  canRetro: boolean
  weekDay: number
}

const { data, pending, refresh } = await useFetch('/api/user/checkin')
const checkinData = computed(() => data.value?.data as any)

const checkingIn = ref(false)
const retroing = ref(false)

const newAchievements = ref<any[]>([])

const recordsData = ref<any>(null)
const recordsPending = ref(false)
const loadingRecords = ref(false)
const currentPage = ref(1)
const pageSize = 20

const records = computed(() => recordsData.value?.records || [])
const pagination = computed(() => recordsData.value?.pagination || null)

const getCurrentRewardIndex = computed(() => {
  if (!checkinData.value) return 0
  const days = checkinData.value.consecutiveDays
  if (days === 0) return 0
  return ((days - 1) % 7) + 1
})

const calendarCells = computed<CheckinCalendarCell[]>(() => {
  if (!checkinData.value?.calendar) return []
  const cal: any[] = checkinData.value.calendar

  const firstDay = cal[0]?.weekDay || 0
  const cells: CheckinCalendarCell[] = []

  for (let i = 0; i < firstDay; i++) {
    cells.push({
      day: 0,
      date: '',
      isCheckedIn: false,
      isRetro: false,
      isToday: false,
      isFuture: false,
      isEmpty: true,
      canRetro: false,
      weekDay: i,
    })
  }

  for (const c of cal) {
    const canRetro = !c.isToday && !c.isFuture && !c.isCheckedIn
    cells.push({
      day: c.day,
      date: c.date,
      isCheckedIn: c.isCheckedIn,
      isRetro: c.isRetro,
      isToday: c.isToday,
      isFuture: c.isFuture,
      isEmpty: false,
      canRetro,
      weekDay: c.weekDay,
    })
  }

  return cells
})

async function loadPage(page: number) {
  if (loadingRecords.value) return
  loadingRecords.value = true
  try {
    const res = await $fetch(`/api/user/points?page=${page}&pageSize=${pageSize}`)
    recordsData.value = (res as any).data
    currentPage.value = page
  } catch (e: any) {
    toast(e?.data?.message || '加载失败', 'error')
  } finally {
    loadingRecords.value = false
  }
}

async function loadRecords() {
  recordsPending.value = true
  try {
    await loadPage(1)
  } finally {
    recordsPending.value = false
  }
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function doCheckin() {
  if (checkingIn.value) return
  checkingIn.value = true
  try {
    const res: any = await $fetch('/api/user/checkin', { method: 'POST' })
    if (res.success) {
      const pts = res.data.totalPointsEarned
      toast(
        `签到成功！获得 ${pts} 积分${res.data.bonusPoints ? `（含额外奖励 ${res.data.bonusPoints}）` : ''}`,
        'success'
      )
      if (res.data.unlockedAchievements?.length > 0) {
        newAchievements.value = res.data.unlockedAchievements
      }
      await refresh()
      await loadRecords()
    }
  } catch (e: any) {
    toast(e?.data?.message || '签到失败', 'error')
  } finally {
    checkingIn.value = false
  }
}

async function handleRetro(cell: CheckinCalendarCell) {
  if (!cell.canRetro || retroing.value) return
  const confirmMsg = `确定使用 ${checkinData.value.retroCost} 积分补签 ${cell.date} 吗？`
  if (!confirm(confirmMsg)) return

  retroing.value = true
  try {
    const res: any = await $fetch('/api/user/checkin', {
      method: 'POST',
      body: { date: cell.date }
    })
    if (res.success) {
      toast(
        `补签成功！消耗 ${checkinData.value.retroCost} 积分，获得 ${res.data.totalPointsEarned} 积分奖励`,
        'success'
      )
      if (res.data.unlockedAchievements?.length > 0) {
        newAchievements.value = res.data.unlockedAchievements
      }
      await refresh()
      await loadRecords()
    }
  } catch (e: any) {
    toast(e?.data?.message || '补签失败', 'error')
  } finally {
    retroing.value = false
  }
}

function closeAchievementModal() {
  newAchievements.value = []
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
@keyframes bounce-in {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-bounce-in {
  animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
</style>
