<template>
  <div>
    <div class="flex items-center gap-4 mb-8">
      <NuxtLink to="/admin/novels" class="p-2 hover:bg-white/10 rounded-lg transition">
        <Icon name="ph:arrow-left" />
      </NuxtLink>
      <h1 class="text-3xl font-bold">添加新小说</h1>
    </div>

    <div class="card p-6 max-w-3xl">
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
          <Button type="submit" :loading="loading" variant="primary">创建小说</Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const router = useRouter()
const toast = useToast()

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
    const { novel } = await $fetch('/api/novels', {
      method: 'POST',
      body: {
        ...form,
        tags: tags.value
      }
    })

    toast.success('创建成功')
    router.push(`/admin/novels/${novel.id}/chapters`)
  } catch (e: any) {
    toast.error(e.message || '创建失败')
  } finally {
    loading.value = false
  }
}

useHead({
  title: '添加小说 - 管理后台'
})
</script>
