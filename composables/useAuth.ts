export const useAuth = () => {
  const user = useState<any>('user', () => null)
  const token = useState<string | null>('token', () => null)

  const fetchUser = async () => {
    try {
      const { data } = await useFetch('/api/auth/me')
      if (data.value?.user) {
        user.value = data.value.user
      }
    } catch (error) {
      user.value = null
    }
  }

  const login = async (email: string, password: string) => {
    const { data, error } = await useFetch('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })

    if (error.value) {
      throw new Error(error.value.data?.message || '登录失败')
    }

    if (data.value) {
      user.value = data.value.user
      token.value = data.value.token
    }

    return data.value
  }

  const register = async (email: string, username: string, password: string, inviteCode?: string) => {
    const body: any = { email, username, password }
    if (inviteCode && inviteCode.trim()) {
      body.inviteCode = inviteCode.trim().toUpperCase()
    }

    const { data, error } = await useFetch('/api/auth/register', {
      method: 'POST',
      body
    })

    if (error.value) {
      throw new Error(error.value.data?.message || '注册失败')
    }

    if (data.value) {
      user.value = data.value.user
      token.value = data.value.token
    }

    return data.value
  }

  const logout = async () => {
    await useFetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    token.value = null
  }

  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  const userLevel = computed(() => user.value?.level || 1)
  const userLevelName = computed(() => user.value?.levelName || '萌新读者')
  const userPoints = computed(() => user.value?.points || 0)
  const userTotalPoints = computed(() => user.value?.totalPoints || 0)
  const userInviteCode = computed(() => user.value?.inviteCode || '')
  const hasAdFree = computed(() => user.value?.adFree === true)

  const getUserLevelProgress = () => {
    if (!user.value) return { current: 0, required: 0, percent: 0 }
    return user.value.levelProgress || { current: 0, required: 0, percent: 0 }
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  return {
    user,
    token,
    isAdmin,
    userLevel,
    userLevelName,
    userPoints,
    userTotalPoints,
    userInviteCode,
    hasAdFree,
    fetchUser,
    refreshUser,
    getUserLevelProgress,
    login,
    register,
    logout
  }
}
