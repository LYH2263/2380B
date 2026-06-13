<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { trackEvent } = useAnalytics()

watch(() => route.path, (newPath) => {
  if (!process.client) return
  
  let eventType = 'PAGE_VIEW' as const
  let eventData: any = { path: newPath }
  
  if (newPath.match(/^\/novels\/\d+$/)) {
    eventType = 'NOVEL_DETAIL_VIEW'
    const novelId = parseInt(newPath.split('/')[2])
    if (!isNaN(novelId)) {
      eventData.novelId = novelId
    }
  }
  
  trackEvent(eventType, eventData)
}, { immediate: true })
</script>
