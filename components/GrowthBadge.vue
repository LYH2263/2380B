<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
    :class="badgeClass"
  >
    <Icon v-if="value > 0" name="ph:arrow-up" class="text-xs" />
    <Icon v-else-if="value < 0" name="ph:arrow-down" class="text-xs" />
    <Icon v-else name="ph:minus" class="text-xs" />
    <span>{{ Math.abs(value) }}%</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  value: number
}

const props = defineProps<Props>()

const badgeClass = computed(() => {
  if (props.value > 0) {
    return 'bg-green-500/20 text-green-400'
  } else if (props.value < 0) {
    return 'bg-red-500/20 text-red-400'
  }
  return 'bg-white/10 text-white/50'
})
</script>
