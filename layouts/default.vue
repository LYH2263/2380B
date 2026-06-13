<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-50 glass border-b border-white/10">
      <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-3 hover:opacity-80 transition">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-neuro-primary to-neuro-secondary flex items-center justify-center">
            <Icon name="ph:book-open-text-fill" class="text-white text-xl" />
          </div>
          <span class="text-xl font-bold bg-gradient-to-r from-neuro-primary to-neuro-secondary bg-clip-text text-transparent">
            Neuro 小说站
          </span>
        </NuxtLink>

        <!-- Navigation -->
        <nav class="hidden md:flex items-center gap-6">
          <NuxtLink 
            to="/" 
            class="text-white/70 hover:text-white transition"
            active-class="text-white font-semibold"
          >
            首页
          </NuxtLink>
          <NuxtLink 
            to="/novels" 
            class="text-white/70 hover:text-white transition"
            active-class="text-white font-semibold"
          >
            小说库
          </NuxtLink>
          <NuxtLink 
            v-if="user" 
            to="/user/favorites" 
            class="text-white/70 hover:text-white transition"
            active-class="text-white font-semibold"
          >
            我的收藏
          </NuxtLink>
        </nav>

        <!-- User Actions -->
        <div class="flex items-center gap-4">
          <template v-if="user">
            <NuxtLink
              to="/messages"
              class="relative p-2 hover:bg-white/10 rounded-lg transition"
              active-class="text-neuro-primary"
            >
              <Icon name="ph:chat-circle-text" class="text-xl" />
              <div
                v-if="totalUnread > 0"
                class="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-neuro-primary text-white text-xs font-bold 
                       rounded-full flex items-center justify-center border-2 border-slate-900"
              >
                {{ totalUnread > 99 ? '99+' : totalUnread }}
              </div>
            </NuxtLink>

            <div class="relative" ref="dropdownRef">
              <button 
                @click="showDropdown = !showDropdown"
                class="flex items-center gap-2 hover:opacity-80 transition"
              >
                <img 
                  :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'" 
                  :alt="user.username"
                  class="w-8 h-8 rounded-full border-2 border-neuro-primary"
                />
                <span class="hidden md:block text-sm">{{ user.username }}</span>
                <Icon name="ph:caret-down" class="text-white/70" />
              </button>

              <!-- Dropdown -->
              <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
              >
                <div 
                  v-if="showDropdown"
                  class="absolute right-0 mt-2 w-56 glass rounded-xl shadow-xl overflow-hidden"
                >
                  <div class="px-4 py-3 border-b border-white/10">
                    <div class="flex items-center gap-3 mb-2">
                      <div class="relative">
                        <img
                          :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
                          class="w-10 h-10 rounded-full"
                        />
                        <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-neuro-primary to-neuro-secondary flex items-center justify-center text-[10px] font-bold border-2 border-slate-900">
                          {{ user.level || 1 }}
                        </div>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="font-semibold truncate" :style="{ color: user.nicknameColor || undefined }">
                          {{ user.username }}
                        </div>
                        <div class="text-xs text-neuro-primary truncate">
                          {{ user.levelName || '萌新读者' }}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center justify-between text-xs bg-white/5 rounded-lg px-2 py-1.5">
                      <span class="flex items-center gap-1 text-yellow-400">
                        <Icon name="ph:coins-fill" />
                        积分
                      </span>
                      <span class="font-semibold text-yellow-400">
                        {{ user.points ?? 0 }}
                      </span>
                    </div>
                  </div>

                  <NuxtLink 
                    to="/user/checkin" 
                    class="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                    @click="showDropdown = false"
                  >
                    <Icon name="ph:calendar-check-fill" class="text-neuro-primary" />
                    <div class="flex-1">
                      <div>每日签到</div>
                      <div class="text-[10px] text-white/40">签到获得积分奖励</div>
                    </div>
                  </NuxtLink>

                  <NuxtLink 
                    to="/user/achievements" 
                    class="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                    @click="showDropdown = false"
                  >
                    <Icon name="ph:trophy-fill" class="text-yellow-400" />
                    <div class="flex-1">
                      <div>成就殿堂</div>
                      <div class="text-[10px] text-white/40">
                        {{ user.achievementCount ?? 0 }} / 20 已解锁
                      </div>
                    </div>
                  </NuxtLink>

                  <NuxtLink 
                    to="/user/shop" 
                    class="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                    @click="showDropdown = false"
                  >
                    <Icon name="ph:storefront-fill" class="text-neuro-accent" />
                    <div class="flex-1">
                      <div>积分商城</div>
                      <div class="text-[10px] text-white/40">用积分兑换虚拟物品</div>
                    </div>
                  </NuxtLink>

                  <NuxtLink 
                    to="/user/favorites" 
                    class="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition"
                    @click="showDropdown = false"
                  >
                    <Icon name="ph:heart-fill" class="text-red-400" />
                    <div class="flex-1">
                      <div>我的收藏</div>
                    </div>
                  </NuxtLink>

                  <NuxtLink 
                    v-if="user.role === 'ADMIN'"
                    to="/admin" 
                    class="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition border-t border-white/10"
                    @click="showDropdown = false"
                  >
                    <Icon name="ph:gear-fill" />
                    <div class="flex-1">
                      <div>管理后台</div>
                    </div>
                  </NuxtLink>

                  <button 
                    @click="handleLogout"
                    class="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-red-400 border-t border-white/10"
                  >
                    <Icon name="ph:sign-out-fill" />
                    <div class="flex-1">
                      <div>退出登录</div>
                    </div>
                  </button>
                </div>
              </Transition>
            </div>
          </template>
          <template v-else>
            <NuxtLink to="/auth/login" class="btn-secondary text-sm py-2 px-4">
              登录
            </NuxtLink>
            <NuxtLink to="/auth/register" class="btn-primary text-sm py-2 px-4">
              注册
            </NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="glass border-t border-white/10 py-8">
      <div class="container mx-auto px-4 text-center text-white/50">
        <p class="mb-2">
          💜 Neurosama 粉丝二创小说阅读平台
        </p>
        <p class="text-sm">
          本站所有内容均为粉丝创作，与官方无关
        </p>
      </div>
    </footer>

    <!-- Toast -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useInterval } from '@vueuse/core'

const { user, logout } = useAuth()
const { totalUnread, fetchTotalUnread } = useMessages()
const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

onClickOutside(dropdownRef, () => {
  showDropdown.value = false
})

watch(user, async (newUser) => {
  if (newUser) {
    await fetchTotalUnread()
  } else {
    totalUnread.value = 0
  }
}, { immediate: true })

useInterval(async () => {
  if (user.value) {
    await fetchTotalUnread()
  }
}, 30000)

const handleLogout = async () => {
  await logout()
  showDropdown.value = false
  navigateTo('/')
}
</script>
