<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4 max-w-3xl">
      <h1 class="text-3xl font-bold mb-8">推送设置</h1>

      <div v-if="pending" class="card p-6 animate-pulse space-y-6">
        <div class="h-8 bg-white/10 rounded w-1/4"></div>
        <div class="space-y-4">
          <div class="h-20 bg-white/10 rounded"></div>
          <div class="h-20 bg-white/10 rounded"></div>
          <div class="h-20 bg-white/10 rounded"></div>
        </div>
      </div>

      <div v-else class="space-y-6">
        <!-- 推送频率 -->
        <div class="card p-6">
          <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
            <Icon name="ph:clock" class="text-neuro-primary" />
            推送频率
          </h2>
          <p class="text-white/60 text-sm mb-4">选择您希望接收更新通知的频率</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label
              :class="[
                'relative p-4 border-2 rounded-xl cursor-pointer transition',
                preferences.pushFrequency === 'REALTIME'
                  ? 'border-neuro-primary bg-neuro-primary/10'
                  : 'border-white/10 hover:border-white/30'
              ]"
            >
              <input
                type="radio"
                name="pushFrequency"
                value="REALTIME"
                v-model="localPreferences.pushFrequency"
                class="sr-only"
                @change="handleFrequencyChange"
              />
              <div class="flex items-start gap-3">
                <Icon name="ph:lightning-fill" class="text-xl text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div class="font-semibold">实时推送</div>
                  <div class="text-sm text-white/60">小说更新时立即通知您</div>
                </div>
              </div>
              <div
                v-if="preferences.pushFrequency === 'REALTIME'"
                class="absolute top-3 right-3 w-5 h-5 bg-neuro-primary rounded-full flex items-center justify-center"
              >
                <Icon name="ph:check" class="text-white text-xs" />
              </div>
            </label>

            <label
              :class="[
                'relative p-4 border-2 rounded-xl cursor-pointer transition',
                preferences.pushFrequency === 'DAILY_DIGEST'
                  ? 'border-neuro-primary bg-neuro-primary/10'
                  : 'border-white/10 hover:border-white/30'
              ]"
            >
              <input
                type="radio"
                name="pushFrequency"
                value="DAILY_DIGEST"
                v-model="localPreferences.pushFrequency"
                class="sr-only"
                @change="handleFrequencyChange"
              />
              <div class="flex items-start gap-3">
                <Icon name="ph:calendar-dots" class="text-xl text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div class="font-semibold">每日汇总</div>
                  <div class="text-sm text-white/60">每天汇总一次更新通知</div>
                </div>
              </div>
              <div
                v-if="preferences.pushFrequency === 'DAILY_DIGEST'"
                class="absolute top-3 right-3 w-5 h-5 bg-neuro-primary rounded-full flex items-center justify-center"
              >
                <Icon name="ph:check" class="text-white text-xs" />
              </div>
            </label>
          </div>
        </div>

        <!-- 通知方式 -->
        <div class="card p-6">
          <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
            <Icon name="ph:bell-ringing" class="text-neuro-primary" />
            通知方式
          </h2>
          <p class="text-white/60 text-sm mb-4">选择您希望接收通知的方式</p>

          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-neuro-primary/20 flex items-center justify-center">
                  <Icon name="ph:desktop" class="text-neuro-primary" />
                </div>
                <div>
                  <div class="font-semibold">站内通知</div>
                  <div class="text-sm text-white/60">在网站内显示通知</div>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPreferences.enableInApp"
                  class="sr-only peer"
                  @change="handleMethodChange('enableInApp', localPreferences.enableInApp)"
                />
                <div class="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-neuro-primary"></div>
              </label>
            </div>

            <div class="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Icon name="ph:envelope" class="text-blue-400" />
                </div>
                <div>
                  <div class="font-semibold">邮件通知</div>
                  <div class="text-sm text-white/60">
                    <span v-if="user?.emailVerified">发送到 {{ user?.email }}</span>
                    <span v-else class="text-yellow-400">需要先验证邮箱</span>
                  </div>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPreferences.enableEmail"
                  :disabled="!user?.emailVerified"
                  class="sr-only peer"
                  @change="handleMethodChange('enableEmail', localPreferences.enableEmail)"
                />
                <div :class="[
                  'w-14 h-7 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\"\"] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all',
                  user?.emailVerified
                    ? 'bg-white/10 peer-checked:bg-blue-500'
                    : 'bg-white/5 cursor-not-allowed'
                ]"></div>
              </label>
            </div>

            <div class="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Icon name="ph:webhooks" class="text-green-400" />
                </div>
                <div>
                  <div class="font-semibold">浏览器推送</div>
                  <div class="text-sm text-white/60">
                    <span v-if="webPushSupported">接收浏览器桌面通知</span>
                    <span v-else class="text-white/40">您的浏览器不支持</span>
                  </div>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPreferences.enableWebPush"
                  :disabled="!webPushSupported"
                  class="sr-only peer"
                  @change="handleWebPushChange"
                />
                <div :class="[
                  'w-14 h-7 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[""] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all',
                  webPushSupported
                    ? 'bg-white/10 peer-checked:bg-green-500'
                    : 'bg-white/5 cursor-not-allowed'
                ]"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- 说明 -->
        <div class="card p-6 bg-white/5">
          <h3 class="font-semibold mb-2 flex items-center gap-2">
            <Icon name="ph:info" class="text-neuro-primary" />
            关于订阅与收藏
          </h3>
          <ul class="text-sm text-white/60 space-y-2">
            <li class="flex items-start gap-2">
              <span class="text-red-400 mt-0.5">❤</span>
              <span><strong>收藏</strong>：将小说加入书架，方便随时阅读，不会收到更新通知</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-neuro-primary mt-0.5">🔔</span>
              <span><strong>订阅</strong>：希望接收小说的更新通知，订阅的小说会自动加入收藏</span>
            </li>
          </ul>
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
const { toast } = useToast()
const { updatePushPreferences } = useNotifications()

const pending = ref(true)
const saving = ref(false)
const webPushSupported = ref('Notification' in window && 'serviceWorker' in navigator)

const { data, refresh } = await useFetch('/api/user/push-preferences')

const preferences = computed(() => data.value?.preferences || {
  pushFrequency: 'REALTIME',
  enableInApp: true,
  enableEmail: false,
  enableWebPush: false
})

const localPreferences = ref({
  pushFrequency: 'REALTIME',
  enableInApp: true,
  enableEmail: false,
  enableWebPush: false
})

watch(preferences, (newVal) => {
  pending.value = false
  if (newVal) {
    localPreferences.value = {
      pushFrequency: newVal.pushFrequency,
      enableInApp: newVal.enableInApp,
      enableEmail: newVal.enableEmail,
      enableWebPush: newVal.enableWebPush
    }
  }
}, { immediate: true })

const handleFrequencyChange = async () => {
  try {
    saving.value = true
    await updatePushPreferences({
      pushFrequency: localPreferences.value.pushFrequency
    })
    toast.success('推送频率已更新')
    await refresh()
  } catch (error: any) {
    toast.error(error.message)
    await refresh()
  } finally {
    saving.value = false
  }
}

const handleMethodChange = async (field: string, value: boolean) => {
  try {
    saving.value = true
    await updatePushPreferences({
      [field]: value
    })
    toast.success('通知方式已更新')
    await refresh()
  } catch (error: any) {
    toast.error(error.message)
    await refresh()
  } finally {
    saving.value = false
  }
}

const handleWebPushChange = async () => {
  if (localPreferences.value.enableWebPush) {
    if (!('Notification' in window)) {
      toast.error('您的浏览器不支持推送通知')
      localPreferences.value.enableWebPush = false
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      toast.error('通知权限被拒绝')
      localPreferences.value.enableWebPush = false
      return
    }
  }

  try {
    saving.value = true
    await updatePushPreferences({
      enableWebPush: localPreferences.value.enableWebPush
    })
    toast.success(localPreferences.value.enableWebPush ? '浏览器推送已开启' : '浏览器推送已关闭')
    await refresh()
  } catch (error: any) {
    toast.error(error.message)
    await refresh()
  } finally {
    saving.value = false
  }
}

useHead({
  title: '推送设置 - Neurosama 粉丝小说站'
})
</script>
