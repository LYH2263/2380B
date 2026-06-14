<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold">标签管理</h1>
      <button @click="openCreateModal" class="btn-primary">
        <Icon name="ph:plus" class="mr-2" />
        新建标签
      </button>
    </div>

    <!-- Filters -->
    <div class="card p-4 mb-6">
      <div class="flex flex-wrap gap-4 items-center">
        <div class="flex-1 min-w-[200px] max-w-md">
          <div class="relative">
            <Icon
              name="ph:magnifying-glass"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4"
            />
            <input
              v-model="search"
              type="text"
              placeholder="搜索标签..."
              class="input-field pl-10"
              @keyup.enter="handleSearch"
            />
          </div>
        </div>

        <select v-model="category" class="input-field w-auto">
          <option value="">全部分类</option>
          <option value="GENRE">题材</option>
          <option value="STYLE">风格</option>
          <option value="ELEMENT">元素</option>
          <option value="OTHER">其他</option>
        </select>

        <label class="flex items-center gap-2 text-white/70">
          <input type="checkbox" v-model="onlyCanonical" class="rounded" />
          仅显示规范标签
        </label>

        <select v-model="sortBy" class="input-field w-auto">
          <option value="useCount">按使用量</option>
          <option value="name">按名称</option>
          <option value="createdAt">按创建时间</option>
        </select>
      </div>
    </div>

    <!-- Batch Actions -->
    <div v-if="selectedTags.length > 0" class="card p-4 mb-6 bg-neuro-primary/10 border-neuro-primary/30">
      <div class="flex items-center justify-between">
        <span class="text-white/80">
          已选择 <span class="text-neuro-primary font-medium">{{ selectedTags.length }}</span> 个标签
        </span>
        <div class="flex gap-3">
          <button @click="openMergeModal" class="btn-secondary text-sm">
            <Icon name="ph:merge" class="mr-1" />
            合并标签
          </button>
          <button @click="clearSelection" class="btn-secondary text-sm">
            取消选择
          </button>
        </div>
      </div>
    </div>

    <!-- Tags Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-white/5">
            <tr>
              <th class="w-12 px-4 py-4">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                  class="rounded"
                />
              </th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">标签名称</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">分类</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">类型</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">使用次数</th>
              <th class="px-6 py-4 text-left text-sm font-medium text-white/70">别名数量</th>
              <th class="px-6 py-4 text-right text-sm font-medium text-white/70">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr
              v-for="tag in tags"
              :key="tag.id"
              class="hover:bg-white/5 transition"
              :class="{ 'bg-neuro-primary/5': selectedTags.includes(tag.id) }"
            >
              <td class="px-4 py-4">
                <input
                  type="checkbox"
                  :checked="selectedTags.includes(tag.id)"
                  @change="toggleTagSelection(tag.id)"
                  class="rounded"
                />
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ tag.name }}</span>
                  <span
                    v-if="!tag.isCanonical"
                    class="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded"
                  >
                    别名 → {{ tag.canonical?.name }}
                  </span>
                </div>
                <p v-if="tag.description" class="text-sm text-white/50 mt-1 line-clamp-1">
                  {{ tag.description }}
                </p>
              </td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded text-xs font-medium', categoryClasses[tag.category]]">
                  {{ categoryLabels[tag.category] }}
                </span>
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ tag.isCanonical ? '规范标签' : '别名标签' }}
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ tag.useCount }}
              </td>
              <td class="px-6 py-4 text-white/70">
                {{ (tag as any)._count?.aliases || 0 }}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(tag)"
                    class="p-2 hover:bg-white/10 rounded-lg transition"
                    title="编辑"
                  >
                    <Icon name="ph:pencil" />
                  </button>
                  <button
                    @click="handleDelete(tag)"
                    class="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                    title="删除"
                  >
                    <Icon name="ph:trash" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="tags.length === 0" class="text-center py-12">
        <Icon name="ph:tag" class="text-5xl text-white/30 mb-4" />
        <p class="text-white/50">暂无标签</p>
      </div>

      <!-- Pagination -->
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

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-6">
              {{ editingTag ? '编辑标签' : '新建标签' }}
            </h3>

            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div class="space-y-2">
                <label class="block text-sm font-medium text-white/70">标签名称 *</label>
                <input
                  v-model="form.name"
                  type="text"
                  class="input-field"
                  placeholder="输入标签名称"
                  required
                />
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-white/70">分类</label>
                <select v-model="form.category" class="input-field">
                  <option value="GENRE">题材</option>
                  <option value="STYLE">风格</option>
                  <option value="ELEMENT">元素</option>
                  <option value="OTHER">其他</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-white/70">描述</label>
                <textarea
                  v-model="form.description"
                  class="input-field"
                  rows="3"
                  placeholder="标签描述（可选）"
                />
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-white/70">
                  <input type="checkbox" v-model="isAlias" class="mr-2 rounded" />
                  设为别名标签
                </label>
                <div v-if="isAlias" class="pl-6">
                  <label class="block text-sm text-white/50 mb-1">规范标签</label>
                  <input
                    v-model="canonicalSearch"
                    type="text"
                    class="input-field"
                    placeholder="搜索规范标签..."
                    @input="searchCanonicalTags"
                  />
                  <div v-if="canonicalSuggestions.length > 0" class="mt-2 bg-white/5 rounded-lg overflow-hidden">
                    <button
                      v-for="tag in canonicalSuggestions"
                      :key="tag.id"
                      type="button"
                      @click="selectCanonicalTag(tag)"
                      class="w-full px-3 py-2 text-left hover:bg-white/10 transition text-sm"
                      :class="{ 'bg-neuro-primary/20': form.canonicalId === tag.id }"
                    >
                      {{ tag.name }}
                      <span class="text-white/40 ml-2">({{ tag.useCount }} 次使用)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="flex justify-end gap-3 pt-4">
                <button type="button" @click="closeModal" class="btn-secondary">取消</button>
                <Button type="submit" :loading="submitLoading" variant="primary">
                  {{ editingTag ? '保存' : '创建' }}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Merge Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showMergeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-lg w-full">
            <h3 class="text-xl font-bold mb-4">合并标签</h3>
            <p class="text-white/70 mb-6">
              将选中的 <span class="text-neuro-primary font-medium">{{ selectedTags.length }}</span> 个标签合并到目标标签。
              合并后，这些标签将成为目标标签的别名，其关联的小说也会转移到目标标签。
            </p>

            <div class="space-y-2 mb-6">
              <label class="block text-sm font-medium text-white/70">目标标签 *</label>
              <input
                v-model="mergeTargetSearch"
                type="text"
                class="input-field"
                placeholder="搜索目标标签..."
                @input="searchMergeTargets"
              />
              <div v-if="mergeSuggestions.length > 0" class="mt-2 bg-white/5 rounded-lg overflow-hidden">
                <button
                  v-for="tag in mergeSuggestions"
                  :key="tag.id"
                  type="button"
                  @click="selectMergeTarget(tag)"
                  class="w-full px-3 py-2 text-left hover:bg-white/10 transition text-sm"
                  :class="{ 'bg-neuro-primary/20': mergeTargetId === tag.id }"
                >
                  {{ tag.name }}
                  <span class="text-white/40 ml-2">({{ tag.useCount }} 次使用)</span>
                </button>
              </div>
            </div>

            <div v-if="mergeTargetId" class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p class="text-yellow-400 text-sm">
                <Icon name="ph:warning" class="inline mr-1" />
                此操作不可撤销，请确认后执行。
              </p>
            </div>

            <div class="flex justify-end gap-3">
              <button @click="closeMergeModal" class="btn-secondary">取消</button>
              <Button @click="confirmMerge" :loading="mergeLoading" variant="danger">
                确认合并
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="card p-6 max-w-md w-full">
            <h3 class="text-xl font-bold mb-4">确认删除</h3>
            <p class="text-white/70 mb-6">
              确定要删除标签「{{ deleteTarget.name }}」吗？
              <span v-if="deleteTarget.useCount > 0" class="text-yellow-400 block mt-2">
                注意：该标签被 {{ deleteTarget.useCount }} 本小说使用，删除后将解除这些关联。
              </span>
            </p>
            <div class="flex justify-end gap-4">
              <button @click="deleteTarget = null" class="btn-secondary">取消</button>
              <Button @click="confirmDelete" :loading="deleteLoading" variant="danger">删除</Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const toast = useToast()

const page = ref(1)
const search = ref('')
const category = ref('')
const onlyCanonical = ref(false)
const sortBy = ref('useCount')
const sortOrder = ref('desc')

const selectedTags = ref<number[]>([])

const { data, refresh } = await useFetch('/api/admin/tags', {
  query: computed(() => ({
    page: page.value,
    search: search.value,
    category: category.value || undefined,
    onlyCanonical: onlyCanonical.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    limit: 20
  })),
  watch: [page, category, onlyCanonical, sortBy, sortOrder]
})

const tags = computed(() => (data.value as any)?.tags || [])
const pagination = computed(() => (data.value as any)?.pagination)

const isAllSelected = computed(() => {
  return tags.value.length > 0 && tags.value.every((t: any) => selectedTags.value.includes(t.id))
})

const isIndeterminate = computed(() => {
  const count = tags.value.filter((t: any) => selectedTags.value.includes(t.id)).length
  return count > 0 && count < tags.value.length
})

const categoryLabels: Record<string, string> = {
  GENRE: '题材',
  STYLE: '风格',
  ELEMENT: '元素',
  OTHER: '其他'
}

const categoryClasses: Record<string, string> = {
  GENRE: 'bg-blue-500/80 text-white',
  STYLE: 'bg-purple-500/80 text-white',
  ELEMENT: 'bg-green-500/80 text-white',
  OTHER: 'bg-gray-500/80 text-white'
}

const handleSearch = () => {
  page.value = 1
  refresh()
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedTags.value = selectedTags.value.filter(
      id => !tags.value.some((t: any) => t.id === id)
    )
  } else {
    const newIds = tags.value.map((t: any) => t.id)
    selectedTags.value = [...new Set([...selectedTags.value, ...newIds])]
  }
}

const toggleTagSelection = (tagId: number) => {
  const idx = selectedTags.value.indexOf(tagId)
  if (idx > -1) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(tagId)
  }
}

const clearSelection = () => {
  selectedTags.value = []
}

const showModal = ref(false)
const editingTag = ref<any>(null)
const submitLoading = ref(false)
const isAlias = ref(false)
const canonicalSearch = ref('')
const canonicalSuggestions = ref<any[]>([])

const form = reactive({
  name: '',
  description: '',
  category: 'OTHER',
  canonicalId: null as number | null
})

const openCreateModal = () => {
  editingTag.value = null
  form.name = ''
  form.description = ''
  form.category = 'OTHER'
  form.canonicalId = null
  isAlias.value = false
  canonicalSearch.value = ''
  canonicalSuggestions.value = []
  showModal.value = true
}

const openEditModal = (tag: any) => {
  editingTag.value = tag
  form.name = tag.name
  form.description = tag.description || ''
  form.category = tag.category
  form.canonicalId = tag.canonicalId
  isAlias.value = !tag.isCanonical
  canonicalSearch.value = tag.canonical?.name || ''
  canonicalSuggestions.value = tag.canonical ? [tag.canonical] : []
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingTag.value = null
}

const searchCanonicalTags = async () => {
  if (!canonicalSearch.value.trim()) {
    canonicalSuggestions.value = []
    return
  }
  try {
    const res = await $fetch('/api/tags', {
      query: {
        type: 'search',
        q: canonicalSearch.value,
        limit: 5
      }
    })
    canonicalSuggestions.value = (res as any).tags.filter((t: any) => t.id !== editingTag.value?.id)
  } catch (e) {
    console.error(e)
  }
}

const selectCanonicalTag = (tag: any) => {
  form.canonicalId = tag.id
  canonicalSearch.value = tag.name
  canonicalSuggestions.value = []
}

const handleSubmit = async () => {
  if (!form.name.trim()) return

  submitLoading.value = true
  try {
    const body: any = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category
    }

    if (isAlias.value && form.canonicalId) {
      body.canonicalId = form.canonicalId
    } else {
      body.canonicalId = null
    }

    if (editingTag.value) {
      await $fetch(`/api/admin/tags/${editingTag.value.id}`, {
        method: 'PUT',
        body
      })
      toast.success('更新成功')
    } else {
      await $fetch('/api/admin/tags', {
        method: 'POST',
        body
      })
      toast.success('创建成功')
    }

    closeModal()
    await refresh()
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

const handleDelete = (tag: any) => {
  deleteTarget.value = tag
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return

  deleteLoading.value = true
  try {
    await $fetch(`/api/admin/tags/${deleteTarget.value.id}`, {
      method: 'DELETE'
    })
    toast.success('删除成功')
    deleteTarget.value = null
    selectedTags.value = selectedTags.value.filter(id => id !== deleteTarget.value?.id)
    await refresh()
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

const showMergeModal = ref(false)
const mergeLoading = ref(false)
const mergeTargetSearch = ref('')
const mergeTargetId = ref<number | null>(null)
const mergeSuggestions = ref<any[]>([])

const openMergeModal = () => {
  mergeTargetSearch.value = ''
  mergeTargetId.value = null
  mergeSuggestions.value = []
  showMergeModal.value = true
}

const closeMergeModal = () => {
  showMergeModal.value = false
}

const searchMergeTargets = async () => {
  if (!mergeTargetSearch.value.trim()) {
    mergeSuggestions.value = []
    return
  }
  try {
    const res = await $fetch('/api/tags', {
      query: {
        type: 'search',
        q: mergeTargetSearch.value,
        limit: 10
      }
    })
    mergeSuggestions.value = (res as any).tags.filter(
      (t: any) => !selectedTags.value.includes(t.id)
    )
  } catch (e) {
    console.error(e)
  }
}

const selectMergeTarget = (tag: any) => {
  mergeTargetId.value = tag.id
  mergeTargetSearch.value = tag.name
  mergeSuggestions.value = []
}

const confirmMerge = async () => {
  if (!mergeTargetId.value || selectedTags.value.length === 0) return

  mergeLoading.value = true
  try {
    await $fetch('/api/admin/tags/merge', {
      method: 'POST',
      body: {
        fromTagIds: selectedTags.value,
        toTagId: mergeTargetId.value
      }
    })
    toast.success('合并成功')
    closeMergeModal()
    clearSelection()
    await refresh()
  } catch (e: any) {
    toast.error(e.message || '合并失败')
  } finally {
    mergeLoading.value = false
  }
}

useHead({
  title: '标签管理 - 管理后台'
})
</script>
