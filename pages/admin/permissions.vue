<template>
  <div>
    <h1 class="text-3xl font-bold mb-8">权限管理</h1>

    <div class="flex gap-2 mb-6">
      <button
        v-for="r in roleKeys"
        :key="r"
        @click="selectedRole = r"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition',
          selectedRole === r ? 'bg-neuro-primary text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
        ]"
      >
        {{ roleLabels[r] }}
      </button>
    </div>

    <div v-if="permissionData" class="card p-6">
      <h2 class="text-xl font-bold mb-4">{{ roleLabels[selectedRole] }} - 权限配置</h2>

      <div v-for="category in categories" :key="category" class="mb-6">
        <h3 class="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">{{ category }}</h3>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="perm in getPermsByCategory(category)"
            :key="perm.code"
            class="flex items-center gap-2 bg-white/5 rounded p-2"
          >
            <input
              type="checkbox"
              :id="perm.code"
              :checked="isGranted(perm.code)"
              @change="togglePermission(perm.code, ($event.target as HTMLInputElement).checked)"
              class="rounded"
            />
            <label :for="perm.code" class="text-sm">
              <span class="text-white/90">{{ perm.name }}</span>
              <span class="text-white/40 text-xs block">{{ perm.description }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8">
      <h2 class="text-xl font-bold mb-4">权限变更历史</h2>
      <div class="card overflow-hidden">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">用户</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">原角色</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">新角色</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">操作人</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">原因</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">时间</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="log in historyLogs" :key="log.id" class="hover:bg-white/5 transition">
              <td class="px-6 py-4 text-sm">{{ log.user?.username }}</td>
              <td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs bg-white/10">{{ roleLabels[log.oldRole] || log.oldRole }}</span></td>
              <td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs bg-neuro-primary/20 text-neuro-primary">{{ roleLabels[log.newRole] || log.newRole }}</span></td>
              <td class="px-6 py-4 text-sm text-white/70">{{ log.changedByUser?.username }}</td>
              <td class="px-6 py-4 text-sm text-white/50 max-w-xs truncate">{{ log.reason || '-' }}</td>
              <td class="px-6 py-4 text-sm text-white/50">{{ formatDate(log.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const roleLabels: Record<string, string> = {
  USER: '普通用户',
  ADMIN: '管理员',
  AUTHOR: '认证作者',
  VIP: '付费会员',
  MODERATOR: '版主'
}

const roleKeys = ['USER', 'AUTHOR', 'VIP', 'MODERATOR', 'ADMIN']
const selectedRole = ref('USER')

const { data: permissionData, refresh: refreshPerms } = await useFetch('/api/admin/permissions')
const { data: historyData } = await useFetch('/api/admin/permissions/history')

const historyLogs = computed(() => historyData.value?.logs || [])

const categories = computed(() => {
  if (!permissionData.value?.categories) return []
  return Object.keys(permissionData.value.categories)
})

const getPermsByCategory = (category: string) => {
  if (!permissionData.value?.allPermissions) return []
  return permissionData.value.allPermissions.filter((p: any) => p.category === category)
}

const isGranted = (code: string) => {
  const roleData = permissionData.value?.roles?.[selectedRole.value]
  if (!roleData) return false
  const perm = roleData.permissions.find((p: any) => p.code === code)
  return perm?.granted || false
}

const togglePermission = async (code: string, granted: boolean) => {
  const currentPerms = permissionData.value?.roles?.[selectedRole.value]?.permissions
    ?.filter((p: any) => p.granted)
    ?.map((p: any) => p.code) || []

  const newPerms = granted
    ? [...new Set([...currentPerms, code])]
    : currentPerms.filter((c: string) => c !== code)

  try {
    await $fetch('/api/admin/permissions/role', {
      method: 'PUT',
      body: { role: selectedRole.value, permissionCodes: newPerms }
    })
    await refreshPerms()
  } catch (e: any) {
    alert(e.data?.message || '操作失败')
  }
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN')

useHead({ title: '权限管理 - 管理后台' })
</script>
