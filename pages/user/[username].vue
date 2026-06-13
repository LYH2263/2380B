<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <div v-if="pending" class="animate-pulse space-y-6">
          <div class="card p-8">
            <div class="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div class="w-32 h-32 rounded-full bg-white/10" />
              <div class="flex-1 text-center md:text-left w-full">
                <div class="h-8 bg-white/10 rounded w-48 mx-auto md:mx-0 mb-2" />
                <div class="h-4 bg-white/10 rounded w-32 mx-auto md:mx-0 mb-4" />
                <div class="flex gap-4 justify-center md:justify-start">
                  <div class="h-4 bg-white/10 rounded w-20" />
                  <div class="h-4 bg-white/10 rounded w-20" />
                  <div class="h-4 bg-white/10 rounded w-20" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="userProfile" class="space-y-6">
          <div class="card p-8">
            <div class="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div class="relative">
                <img
                  :src="userProfile.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                  :alt="userProfile.username"
                  class="w-32 h-32 rounded-full border-4 border-neuro-primary shadow-xl"
                />
                <div class="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-neuro-primary to-neuro-secondary flex items-center justify-center text-sm font-bold border-4 border-slate-900">
                  {{ userProfile.level || 1 }}
                </div>
              </div>

              <div class="flex-1 text-center md:text-left">
                <h1 class="text-3xl font-bold mb-2" :style="{ color: userProfile.nicknameColor || undefined }">
                  {{ userProfile.username }}
                </h1>
                <p class="text-white/50 mb-4">
                  {{ getLevelName(userProfile.level || 1) }}
                </p>

                <div class="flex gap-6 justify-center md:justify-start mb-6">
                  <div class="text-center">
                    <p class="text-2xl font-bold text-neuro-primary">{{ userProfile._count?.novels || 0 }}</p>
                    <p class="text-sm text-white/50">作品</p>
                  </div>
                  <div class="text-center">
                    <p class="text-2xl font-bold text-neuro-secondary">{{ userProfile._count?.favorites || 0 }}</p>
                    <p class="text-sm text-white/50">收藏</p>
                  </div>
                  <div class="text-center">
                    <p class="text-2xl font-bold text-neuro-accent">{{ userProfile._count?.comments || 0 }}</p>
                    <p class="text-sm text-white/50">评论</p>
                  </div>
                </div>

                <p v-if="userProfile.bio" class="text-white/70 mb-6 leading-relaxed">
                  {{ userProfile.bio }}
                </p>

                <div class="flex gap-3 justify-center md:justify-start">
                  <template v-if="!userProfile.isSelf && currentUser">
                    <Button
                      @click="handleSendMessage"
                      :loading="startingConversation"
                      variant="primary"
                      size="md"
                      class="flex items-center gap-2"
                    >
                      <Icon name="ph:paper-plane-right-fill" />
                      发私信
                    </Button>
                  </template>
                  <template v-else-if="userProfile.isSelf">
                    <NuxtLink to="/user/favorites" class="btn-secondary">
                      <Icon name="ph:heart-fill" class="mr-2" />
                      我的收藏
                    </NuxtLink>
                  </template>
                  <template v-else>
                    <NuxtLink to="/auth/login" class="btn-primary">
                      <Icon name="ph:sign-in-fill" class="mr-2" />
                      登录后发私信
                    </NuxtLink>
                  </template>
                </div>
              </div>
            </div>

            <div class="mt-6 pt-6 border-t border-white/10">
              <div class="flex flex-wrap gap-4 text-sm text-white/50">
                <div class="flex items-center gap-2">
                  <Icon name="ph:calendar" />
                  <span>加入于 {{ formatDate(userProfile.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-20">
          <Icon name="ph:user-x" class="text-6xl text-white/30 mb-4" />
          <p class="text-xl text-white/50">用户不存在</p>
          <NuxtLink to="/" class="btn-primary mt-4 inline-block">
            返回首页
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { user: currentUser } = useAuth()
const toast = useToast()

const username = computed(() => route.params.username as string)

const { data: profileData, pending, refresh } = await useFetch(`/api/users/${username.value}`)

const userProfile = computed(() => profileData.value?.user || null)

const startingConversation = ref(false)

const { startConversation } = useMessages()

const getLevelName = (level: number): string => {
  const levelNames: Record<number, string> = {
    1: '萌新读者',
    2: '初级读者',
    3: '中级读者',
    4: '高级读者',
    5: '资深读者',
    6: '文学爱好者',
    7: '书评达人',
    8: '作家助手',
    9: '新锐作家',
    10: '知名作家'
  }
  return levelNames[level] || `LV.${level}`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const handleSendMessage = async () => {
  if (!userProfile.value || !currentUser.value) return

  startingConversation.value = true
  try {
    let conversationId = userProfile.value.conversationId

    if (!conversationId) {
      conversationId = await startConversation(userProfile.value.id)
    }

    if (conversationId) {
      navigateTo(`/messages/${conversationId}`)
    }
  } catch (e: any) {
    toast.error(e.message || '打开私信失败')
  } finally {
    startingConversation.value = false
  }
}

useHead({
  title: computed(() => userProfile.value ? `${userProfile.value.username} 的个人主页 - Neurosama 粉丝小说站` : '用户主页 - Neurosama 粉丝小说站')
})
</script>
