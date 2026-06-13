<template>
  <div>
    <h1 class="text-3xl font-bold mb-8">作者认证审核</h1>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">申请人</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">申请理由</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">状态</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">申请时间</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="app in applications" :key="app.id" class="hover:bg-white/5 transition">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <img :src="app.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'" class="w-8 h-8 rounded-full" />
                  <div>
                    <span class="font-medium text-sm">{{ app.user?.username }}</span>
                    <p class="text-white/40 text-xs">{{ app.user?.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-white/70 text-sm max-w-xs truncate">{{ app.reason }}</td>
              <td class="px-6 py-4">
                <span :class="statusClass(app.status)">{{ statusLabel(app.status) }}</span>
              </td>
              <td class="px-6 py-4 text-white/70 text-sm">{{ formatDate(app.createdAt) }}</td>
              <td class="px-6 py-4">
                <template v-if="app.status === 'PENDING'">
                  <button @click="reviewApplication(app.id, 'APPROVED')" class="text-green-400 hover:text-green-300 text-sm mr-3">通过</button>
                  <button @click="reviewApplication(app.id, 'REJECTED')" class="text-red-400 hover:text-red-300 text-sm">拒绝</button>
                </template>
                <span v-else class="text-white/30 text-xs">
                  {{ app.reviewer?.username }} 审核于 {{ app.reviewedAt ? formatDate(app.reviewedAt) : '-' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination && pagination.totalPages > 1" class="p-4 border-t border-white/10 flex justify-center gap-2">
        <button @click="page--" :disabled="page <= 1" class="btn-secondary px-3 py-1 disabled:opacity-50">上一页</button>
        <span class="px-4 py-1 text-white/70">{{ page }} / {{ pagination.totalPages }}</span>
        <button @click="page++" :disabled="page >= pagination.totalPages" class="btn-secondary px-3 py-1 disabled:opacity-50">下一页</button>
      </div>
    </div>

    <div v-if="showReviewModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showReviewModal = false">
      <div class="card w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-4">{{ reviewAction === 'APPROVED' ? '通过' : '拒绝' }}申请</h2>
        <div class="mb-4">
          <label class="block text-sm text-white/70 mb-2">审核备注（可选）</label>
          <textarea v-model="reviewNote" rows="3" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="输入审核备注"></textarea>
        </div>
        <div class="flex gap-3 justify-end">
          <button @click="showReviewModal = false" class="btn-secondary px-4 py-2">取消</button>
          <button @click="confirmReview" class="btn-primary px-4 py-2">确认</button>
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

const page = ref(1)

const { data, refresh } = await useFetch('/api/author/application/list', {
  query: computed(() => ({ page: page.value, limit: 20 })),
  watch: [page]
})

const applications = computed(() => data.value?.applications || [])
const pagination = computed(() => data.value?.pagination)

const showReviewModal = ref(false)
const reviewAction = ref<'APPROVED' | 'REJECTED'>('APPROVED')
const reviewAppId = ref(0)
const reviewNote = ref('')

const statusLabel = (s: string) => ({ PENDING: '待审核', APPROVED: '已通过', REJECTED: '已拒绝' }[s] || s)
const statusClass = (s: string) => ({
  PENDING: 'px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400',
  APPROVED: 'px-2 py-1 rounded text-xs bg-green-500/20 text-green-400',
  REJECTED: 'px-2 py-1 rounded text-xs bg-red-500/20 text-red-400'
}[s] || '')

const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN')

const reviewApplication = (id: number, action: 'APPROVED' | 'REJECTED') => {
  reviewAppId.value = id
  reviewAction.value = action
  reviewNote.value = ''
  showReviewModal.value = true
}

const confirmReview = async () => {
  try {
    await $fetch('/api/author/application/review', {
      method: 'POST',
      body: { applicationId: reviewAppId.value, action: reviewAction.value, reviewNote: reviewNote.value || undefined }
    })
    showReviewModal.value = false
    await refresh()
  } catch (e: any) {
    alert(e.data?.message || '操作失败')
  }
}

useHead({ title: '作者认证审核 - 管理后台' })
</script>
