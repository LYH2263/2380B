<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">VIP会员</h1>

    <div v-if="isVip" class="card p-6 mb-6">
      <div class="flex items-center gap-3">
        <span class="text-3xl">👑</span>
        <div>
          <h2 class="text-xl font-bold text-yellow-400">VIP会员</h2>
          <p v-if="vipStatus?.vipExpiresAt" class="text-white/70 text-sm">
            到期时间: {{ formatDate(vipStatus.vipExpiresAt) }}
          </p>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="bg-white/5 rounded-lg p-3">
          <p class="text-xs text-white/50">无广告</p>
          <span class="text-green-400 text-sm">已启用</span>
        </div>
        <div class="bg-white/5 rounded-lg p-3">
          <p class="text-xs text-white/50">专属标识</p>
          <span class="text-yellow-400 text-sm">已启用</span>
        </div>
        <div class="bg-white/5 rounded-lg p-3">
          <p class="text-xs text-white/50">优先更新</p>
          <span class="text-blue-400 text-sm">已启用</span>
        </div>
        <div class="bg-white/5 rounded-lg p-3">
          <p class="text-xs text-white/50">抢先阅读</p>
          <span class="text-purple-400 text-sm">已启用</span>
        </div>
      </div>
    </div>

    <div v-else class="card p-6 mb-6">
      <div class="text-center py-8">
        <span class="text-5xl mb-4 block">👑</span>
        <h2 class="text-2xl font-bold mb-2">升级VIP会员</h2>
        <p class="text-white/70 mb-6">享受无广告、专属标识、优先更新通知等特权</p>
        <div class="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
          <div class="bg-white/5 rounded-lg p-4">
            <h3 class="font-bold text-yellow-400 mb-2">无广告</h3>
            <p class="text-white/50 text-xs">全站无广告干扰</p>
          </div>
          <div class="bg-white/5 rounded-lg p-4">
            <h3 class="font-bold text-yellow-400 mb-2">专属标识</h3>
            <p class="text-white/50 text-xs">VIP专属身份标识</p>
          </div>
          <div class="bg-white/5 rounded-lg p-4">
            <h3 class="font-bold text-yellow-400 mb-2">优先更新</h3>
            <p class="text-white/50 text-xs">优先接收更新通知</p>
          </div>
          <div class="bg-white/5 rounded-lg p-4">
            <h3 class="font-bold text-yellow-400 mb-2">抢先阅读</h3>
            <p class="text-white/50 text-xs">抢先阅读新章节</p>
          </div>
        </div>
        <p class="text-white/50 text-xs mt-6">VIP会员需由管理员开通，如需开通请联系管理员</p>
      </div>
    </div>

    <div v-if="vipStatus?.memberships?.length" class="mt-8">
      <h2 class="text-xl font-bold mb-4">会员记录</h2>
      <div class="space-y-3">
        <div v-for="m in vipStatus.memberships" :key="m.id" class="card p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm">{{ formatDate(m.startDate) }} - {{ formatDate(m.endDate) }}</p>
              <p class="text-xs text-white/50 mt-1">{{ m.isActive ? '有效' : '已过期' }}</p>
            </div>
            <span :class="m.isActive ? 'text-green-400' : 'text-white/30'" class="text-xs">
              {{ m.isActive ? '●' : '○' }}
            </span>
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

const { isVip } = useAuth()

const { data: vipStatus } = await useFetch('/api/vip/status')

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN')

useHead({ title: 'VIP会员' })
</script>
