<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">申请成为认证作者</h1>

    <div v-if="isAuthor" class="card p-6 mb-6">
      <div class="flex items-center gap-3">
        <span class="text-3xl">✅</span>
        <div>
          <h2 class="text-xl font-bold text-green-400">您已是认证作者</h2>
          <p class="text-white/70 text-sm">您已拥有认证作者身份，可以创建和管理批注。</p>
        </div>
      </div>
    </div>

    <div v-else>
      <div class="card p-6 mb-6">
        <h2 class="text-lg font-bold mb-3">认证作者权益</h2>
        <ul class="space-y-2 text-white/70 text-sm">
          <li class="flex items-center gap-2"><span class="text-green-400">✓</span> 创建和查看章节批注</li>
          <li class="flex items-center gap-2"><span class="text-green-400">✓</span> 解决批注问题</li>
          <li class="flex items-center gap-2"><span class="text-green-400">✓</span> 专属认证作者标识</li>
          <li class="flex items-center gap-2"><span class="text-green-400">✓</span> 优先内容推荐</li>
        </ul>
      </div>

      <div v-if="pendingApplication" class="card p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-2xl">⏳</span>
          <div>
            <h2 class="text-lg font-bold text-yellow-400">申请审核中</h2>
            <p class="text-white/70 text-sm">您于 {{ formatDate(pendingApplication.createdAt) }} 提交的申请正在审核中，请耐心等待。</p>
          </div>
        </div>
      </div>

      <div v-else class="card p-6">
        <h2 class="text-lg font-bold mb-4">提交申请</h2>
        <div class="mb-4">
          <label class="block text-sm text-white/70 mb-2">申请理由</label>
          <textarea
            v-model="reason"
            rows="6"
            class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neuro-primary/50"
            placeholder="请说明您希望成为认证作者的理由，例如您的创作经历、作品情况等（至少10个字符）"
          ></textarea>
          <p v-if="reason.length > 0 && reason.length < 10" class="text-red-400 text-xs mt-1">申请理由至少需要10个字符</p>
        </div>
        <button
          @click="submitApplication"
          :disabled="reason.length < 10 || submitting"
          class="btn-primary px-6 py-2 disabled:opacity-50"
        >
          {{ submitting ? '提交中...' : '提交申请' }}
        </button>
      </div>
    </div>

    <div v-if="applications.length > 0" class="mt-8">
      <h2 class="text-xl font-bold mb-4">申请记录</h2>
      <div class="space-y-3">
        <div v-for="app in applications" :key="app.id" class="card p-4">
          <div class="flex items-center justify-between mb-2">
            <span :class="statusClass(app.status)">{{ statusLabel(app.status) }}</span>
            <span class="text-white/50 text-xs">{{ formatDate(app.createdAt) }}</span>
          </div>
          <p class="text-white/70 text-sm mb-2">{{ app.reason }}</p>
          <div v-if="app.reviewNote" class="bg-white/5 rounded p-2 text-xs text-white/50">
            审核备注: {{ app.reviewNote }}
          </div>
          <div v-if="app.reviewer" class="text-xs text-white/40 mt-1">
            审核人: {{ app.reviewer.username }}
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

const { isAuthor } = useAuth()

const reason = ref('')
const submitting = ref(false)

const { data: myData, refresh } = await useFetch('/api/author/application/mine')
const applications = computed(() => myData.value?.applications || [])
const pendingApplication = computed(() => applications.value.find((a: any) => a.status === 'PENDING'))

const statusLabel = (status: string) => {
  const labels: Record<string, string> = { PENDING: '审核中', APPROVED: '已通过', REJECTED: '已拒绝' }
  return labels[status] || status
}

const statusClass = (status: string) => {
  const classes: Record<string, string> = {
    PENDING: 'px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400',
    APPROVED: 'px-2 py-1 rounded text-xs bg-green-500/20 text-green-400',
    REJECTED: 'px-2 py-1 rounded text-xs bg-red-500/20 text-red-400'
  }
  return classes[status] || ''
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN')

const submitApplication = async () => {
  submitting.value = true
  try {
    await $fetch('/api/author/application/apply', {
      method: 'POST',
      body: { reason: reason.value }
    })
    reason.value = ''
    await refresh()
  } catch (e: any) {
    alert(e.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

useHead({ title: '申请认证作者' })
</script>
