export const useNotifications = () => {
  const unreadCount = ref(0)

  const fetchUnreadCount = async () => {
    try {
      const { data } = await useFetch('/api/user/notifications/unread-count')
      if (data.value) {
        unreadCount.value = data.value.unreadCount || 0
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const toggleSubscription = async (novelId: number) => {
    try {
      const { data } = await useFetch(`/api/novels/${novelId}/subscribe`, {
        method: 'POST'
      })
      return data.value
    } catch (error: any) {
      throw new Error(error.data?.message || '操作失败')
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      await useFetch(`/api/user/notifications/${notificationId}/read`, {
        method: 'POST'
      })
      await fetchUnreadCount()
      return true
    } catch (error: any) {
      throw new Error(error.data?.message || '操作失败')
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data } = await useFetch('/api/user/notifications/read-all', {
        method: 'POST'
      })
      await fetchUnreadCount()
      return data.value
    } catch (error: any) {
      throw new Error(error.data?.message || '操作失败')
    }
  }

  const batchUnsubscribe = async (novelIds: number[]) => {
    try {
      const { data } = await useFetch('/api/user/subscriptions/unsubscribe', {
        method: 'POST',
        body: { novelIds }
      })
      return data.value
    } catch (error: any) {
      throw new Error(error.data?.message || '操作失败')
    }
  }

  const updatePushPreferences = async (preferences: any) => {
    try {
      const { data } = await useFetch('/api/user/push-preferences', {
        method: 'PUT',
        body: preferences
      })
      return data.value
    } catch (error: any) {
      throw new Error(error.data?.message || '操作失败')
    }
  }

  return {
    unreadCount,
    fetchUnreadCount,
    toggleSubscription,
    markAsRead,
    markAllAsRead,
    batchUnsubscribe,
    updatePushPreferences
  }
}
