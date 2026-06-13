<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">用户管理</h1>
      <div class="flex gap-2">
        <select v-model="roleFilter" class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option value="">全部角色</option>
          <option value="USER">普通用户</option>
          <option value="AUTHOR">认证作者</option>
          <option value="VIP">付费会员</option>
          <option value="MODERATOR">版主</option>
          <option value="ADMIN">管理员</option>
        </select>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">用户</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">邮箱</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">角色</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">小说</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">评论</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">注册时间</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr
              v-for="u in users"
              :key="u.id"
              class="hover:bg-white/5 transition"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <img
                    :src="u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                    :alt="u.username"
                    class="w-10 h-10 rounded-full"
                  />
                  <span class="font-medium">{{ u.username }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ u.email }}
              </td>
              <td class="px-6 py-4">
                <span :class="roleBadgeClass(u.role)">
                  {{ roleLabel(u.role) }}
                </span>
                <span v-if="u.vipExpiresAt && new Date(u.vipExpiresAt) > new Date()" class="ml-1 px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                  VIP到期: {{ formatDate(u.vipExpiresAt) }}
                </span>
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ u._count?.novels || 0 }}
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ u._count?.comments || 0 }}
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ formatDate(u.createdAt) }}
              </td>
              <td class="px-6 py-4">
                <button
                  @click="openRoleModal(u)"
                  class="text-sm text-neuro-primary hover:text-neuro-primary/80 transition"
                >
                  调整角色
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination && pagination.totalPages > 1" class="p-4 border-t border-white/10 flex justify-center gap-2">
        <button
          @click="page--"
          :disabled="page <= 1"
          class="btn-secondary px-3 py-1 disabled:opacity-50"
        >
          上一页
        </button>
        <span class="px-4 py-1 text-white/70">
          {{ page }} / {{ pagination.totalPages }}
        </span>
        <button
          @click="page++"
          :disabled="page >= pagination.totalPages"
          class="btn-secondary px-3 py-1 disabled:opacity-50"
        >
          下一页
        </button>
      </div>
    </div>

    <div v-if="showRoleModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showRoleModal = false">
      <div class="card w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-4">调整用户角色</h2>
        <div class="mb-4">
          <p class="text-white/70 text-sm">用户: <span class="text-white font-medium">{{ selectedUser?.username }}</span></p>
          <p class="text-white/70 text-sm">当前角色: <span class="text-white font-medium">{{ roleLabel(selectedUser?.role) }}</span></p>
        </div>

        <div class="mb-4">
          <label class="block text-sm text-white/70 mb-2">新角色</label>
          <select v-model="newRole" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <option value="USER">普通用户</option>
            <option value="AUTHOR">认证作者</option>
            <option value="VIP">付费会员</option>
            <option value="MODERATOR">版主</option>
            <option value="ADMIN">管理员</option>
          </select>
        </div>

        <div v-if="newRole === 'VIP'" class="mb-4">
          <label class="block text-sm text-white/70 mb-2">VIP天数</label>
          <input v-model.number="vipDays" type="number" min="1" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2" placeholder="输入VIP天数" />
        </div>

        <div class="mb-4">
          <label class="block text-sm text-white/70 mb-2">变更原因</label>
          <textarea v-model="roleChangeReason" rows="3" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="输入变更原因（可选）"></textarea>
        </div>

        <div class="flex gap-3 justify-end">
          <button @click="showRoleModal = false" class="btn-secondary px-4 py-2">取消</button>
          <button @click="submitRoleChange" class="btn-primary px-4 py-2" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认' }}
          </button>
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
const roleFilter = ref('')

const { data, refresh } = await useFetch('/api/admin/users', {
  query: computed(() => ({ page: page.value, limit: 20, role: roleFilter.value || undefined })),
  watch: [page, roleFilter]
})

const users = computed(() => data.value?.users || [])
const pagination = computed(() => data.value?.pagination)

const showRoleModal = ref(false)
const selectedUser = ref<any>(null)
const newRole = ref('USER')
const vipDays = ref(30)
const roleChangeReason = ref('')
const submitting = ref(false)

const ROLE_LABELS: Record<string, string> = {
  USER: '普通用户',
  ADMIN: '管理员',
  AUTHOR: '认证作者',
  VIP: '付费会员',
  MODERATOR: '版主'
}

const roleLabel = (role: string) => ROLE_LABELS[role] || role

const roleBadgeClass = (role: string) => {
  const classes: Record<string, string> = {
    ADMIN: 'px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400',
    AUTHOR: 'px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400',
    VIP: 'px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400',
    MODERATOR: 'px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400',
    USER: 'px-2 py-1 rounded text-xs font-medium bg-white/10 text-white/70'
  }
  return classes[role] || classes.USER
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const openRoleModal = (user: any) => {
  selectedUser.value = user
  newRole.value = user.role
  roleChangeReason.value = ''
  vipDays.value = 30
  showRoleModal.value = true
}

const submitRoleChange = async () => {
  if (!selectedUser.value || newRole.value === selectedUser.value.role) return
  submitting.value = true
  try {
    if (newRole.value === 'VIP') {
      await $fetch('/api/vip/admin/activate', {
        method: 'POST',
        body: {
          userId: selectedUser.value.id,
          durationDays: vipDays.value,
          reason: roleChangeReason.value || undefined
        }
      })
    } else {
      await $fetch('/api/admin/users/role', {
        method: 'PUT',
        body: {
          userId: selectedUser.value.id,
          newRole: newRole.value,
          reason: roleChangeReason.value || undefined
        }
      })
    }
    showRoleModal.value = false
    await refresh()
  } catch (e: any) {
    alert(e.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

useHead({
  title: '用户管理 - 管理后台'
})
</script>
