<template>
  <div>
    <div class="flex items-center gap-4 mb-8">
      <NuxtLink to="/admin/novels" class="p-2 hover:bg-white/10 rounded-lg transition">
        <Icon name="ph:arrow-left" />
      </NuxtLink>
      <h1 class="text-3xl font-bold">编辑小说</h1>
    </div>

    <div v-if="pending" class="card p-6 max-w-3xl animate-pulse space-y-4">
      <div class="h-10 bg-white/10 rounded" />
      <div class="h-32 bg-white/10 rounded" />
      <div class="h-10 bg-white/10 rounded" />
    </div>

    <div v-else-if="novel" class="card p-6 max-w-3xl">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <FormInput
          v-model="form.title"
          label="小说标题"
          placeholder="输入小说标题"
          :error="errors.title"
          required
        />

        <FormTextarea
          v-model="form.description"
          label="小说简介"
          placeholder="输入小说简介..."
          :rows="5"
          :error="errors.description"
          required
        />

        <FormInput
          v-model="form.cover"
          label="封面图片 URL"
          placeholder="https://..."
          :error="errors.cover"
        />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-white/70">状态</label>
          <select v-model="form.status" class="input-field">
            <option value="ONGOING">连载中</option>
            <option value="COMPLETED">已完结</option>
            <option value="HIATUS">暂停更新</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-white/70">标签</label>
          <TagInput
            ref="tagInputRef"
            v-model="tags"
            placeholder="输入标签，按回车添加..."
            :enable-recommendations="true"
          />
          <p class="text-xs text-white/40">
            提示：输入时会自动匹配已有标签，基于标题和简介可获得智能推荐
          </p>
        </div>

        <div class="flex justify-end gap-4">
          <NuxtLink to="/admin/novels" class="btn-secondary">取消</NuxtLink>
          <Button type="submit" :loading="loading" variant="primary">保存修改</Button>
        </div>
      </form>
    </div>

    <div v-else class="text-center py-20">
      <Icon name="ph:warning" class="text-6xl text-white/30 mb-4" />
      <p class="text-xl text-white/50">小说不存在</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const novelId = computed(() => route.params.id)

const { data: novel, pending } = await useFetch(`/api/novels/${novelId.value}`)

const form = reactive({
  title: '',
  description: '',
  cover: '',
  status: 'ONGOING'
})

const tags = ref<string[]>([])

const errors = reactive({
  title: '',
  description: '',
  cover: ''
})

const loading = ref(false)

const tagInputRef = ref<any>(null)

let recommendDebounce: ReturnType<typeof setTimeout> | null = null

const triggerRecommend = () => {
  if (recommendDebounce) clearTimeout(recommendDebounce)
  recommendDebounce = setTimeout(() => {
    if (tagInputRef.value) {
      tagInputRef.value.getRecommendations(form.title, form.description)
    }
  }, 500)
}

watch(() => form.title, triggerRecommend)
watch(() => form.description, triggerRecommend)

// 初始化表单数据
watch(novel, (val) => {
  if (val) {
    form.title = val.title
    form.description = val.description
    form.cover = val.cover || ''
    form.status = val.status
    tags.value = val.tags || []
  }
}, { immediate: true })

const validate = () => {
  errors.title = ''
  errors.description = ''
  errors.cover = ''

  if (!form.title.trim()) {
    errors.title = '请输入标题'
    return false
  }
  if (!form.description.trim() || form.description.length < 10) {
    errors.description = '简介至少10个字符'
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!validate()) return

  loading.value = true
  try {
    await $fetch(`/api/novels/${novelId.value}`, {
      method: 'PUT',
      body: {
        ...form,
        tags: tags.value
      }
    })

    toast.success('保存成功')
    router.push('/admin/novels')
  } catch (e: any) {
    toast.error(e.message || '保存失败')
  } finally {
    loading.value = false
  }
}

useHead({
  title: computed(() => novel.value ? `编辑 ${novel.value.title} - 管理后台` : '加载中...')
})
</script>
