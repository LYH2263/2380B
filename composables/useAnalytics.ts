import type { AnalyticsEventType } from '@prisma/client'

const DEVICE_ID_KEY = 'analytics_device_id'

function generateDeviceId(): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  let fingerprint = navigator.userAgent || ''
  fingerprint += navigator.language || ''
  fingerprint += screen.width + 'x' + screen.height
  fingerprint += new Date().getTimezoneOffset()
  fingerprint += navigator.hardwareConcurrency || ''
  fingerprint += navigator.platform || ''
  
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('🤖', 2, 2)
    fingerprint += canvas.toDataURL()
  }
  
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return 'dev_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36)
}

export function useAnalytics() {
  const { user } = useAuth()
  
  const deviceId = ref<string>('')
  
  if (process.client) {
    let stored = localStorage.getItem(DEVICE_ID_KEY)
    if (!stored) {
      stored = generateDeviceId()
      localStorage.setItem(DEVICE_ID_KEY, stored)
    }
    deviceId.value = stored
  }
  
  const trackEvent = async (
    type: AnalyticsEventType,
    data: {
      novelId?: number
      chapterId?: number
      path?: string
      referrer?: string
      properties?: Record<string, any>
    } = {}
  ) => {
    try {
      await $fetch('/api/analytics/track', {
        method: 'POST',
        body: {
          type,
          deviceId: deviceId.value,
          userId: user.value?.id,
          novelId: data.novelId,
          chapterId: data.chapterId,
          path: data.path || window.location.pathname,
          referrer: data.referrer || document.referrer,
          userAgent: navigator.userAgent,
          properties: data.properties
        }
      })
    } catch (e) {
      console.warn('Analytics tracking failed:', e)
    }
  }
  
  const startReadingSession = (
    novelId: number,
    chapterId: number,
    totalParagraphs: number
  ) => {
    const startTime = Date.now()
    let lastParagraph = 0
    let sessionId: number | null = null
    
    const initSession = async () => {
      try {
        const res = await $fetch<{ sessionId: number }>('/api/analytics/reading/start', {
          method: 'POST',
          body: {
            deviceId: deviceId.value,
            userId: user.value?.id,
            novelId,
            chapterId,
            totalParagraphs
          }
        })
        sessionId = res.sessionId
      } catch (e) {
        console.warn('Failed to start reading session:', e)
      }
    }
    
    initSession()
    
    const updateProgress = (paragraphIndex: number) => {
      if (paragraphIndex > lastParagraph) {
        lastParagraph = paragraphIndex
      }
    }
    
    const endSession = async (completed: boolean = false) => {
      if (!sessionId) return
      
      const duration = Math.floor((Date.now() - startTime) / 1000)
      const completionRate = totalParagraphs > 0 
        ? Math.min(100, (lastParagraph / totalParagraphs) * 100)
        : 0
      
      try {
        await $fetch('/api/analytics/reading/end', {
          method: 'POST',
          body: {
            sessionId,
            duration,
            lastParagraph,
            completionRate,
            exitPoint: lastParagraph,
            isCompleted: completed
          }
        })
      } catch (e) {
        console.warn('Failed to end reading session:', e)
      }
    }
    
    const heartbeat = async () => {
      if (!sessionId) return
      
      const duration = Math.floor((Date.now() - startTime) / 1000)
      const completionRate = totalParagraphs > 0 
        ? Math.min(100, (lastParagraph / totalParagraphs) * 100)
        : 0
      
      try {
        await $fetch('/api/analytics/reading/heartbeat', {
          method: 'POST',
          body: {
            sessionId,
            duration,
            lastParagraph,
            completionRate
          }
        })
      } catch (e) {
        console.warn('Heartbeat failed:', e)
      }
    }
    
    return {
      updateProgress,
      endSession,
      heartbeat
    }
  }
  
  return {
    deviceId,
    trackEvent,
    startReadingSession
  }
}
