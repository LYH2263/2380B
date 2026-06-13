<template>
  <div class="w-full h-full" ref="containerRef">
    <svg :width="width" :height="height" class="overflow-visible">
      <defs>
        <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(139, 92, 246, 1)" />
          <stop offset="100%" stop-color="rgba(139, 92, 246, 0.5)" />
        </linearGradient>
      </defs>
      
      <g :transform="`translate(${padding.left}, ${padding.top})`">
        <g class="grid-lines">
          <line
            v-for="i in 5"
            :key="'h-' + i"
            :x1="0"
            :y1="(chartHeight / 5) * i"
            :x2="chartWidth"
            :y2="(chartHeight / 5) * i"
            stroke="rgba(255,255,255,0.1)"
            stroke-dasharray="4,4"
          />
        </g>
        
        <g>
          <g v-for="(item, idx) in data" :key="idx">
            <rect
              :x="getX(idx)"
              :y="getY(item.value)"
              :width="barWidth"
              :height="chartHeight - getY(item.value)"
              rx="4"
              fill="url(#barGradient)"
              class="hover:opacity-90 transition-opacity cursor-pointer"
              @mouseenter="showTooltip(item, $event)"
              @mouseleave="hideTooltip"
            />
          </g>
        </g>
        
        <g class="x-axis">
          <text
            v-for="(item, idx) in data"
            :key="'x-' + idx"
            :x="getX(idx) + barWidth / 2"
            :y="chartHeight + 20"
            text-anchor="middle"
            fill="rgba(255,255,255,0.5)"
            font-size="10"
          >
            {{ item.label }}
          </text>
        </g>
        
        <g class="y-axis">
          <text
            v-for="(label, idx) in yLabels"
            :key="'y-' + idx"
            :x="-8"
            :y="chartHeight - (chartHeight / (yLabels.length - 1)) * idx + 4"
            text-anchor="end"
            fill="rgba(255,255,255,0.5)"
            font-size="10"
          >
            {{ label }}
          </text>
        </g>
      </g>
    </svg>
    
    <Transition name="fade">
      <div
        v-if="tooltip.show"
        class="absolute glass rounded-lg px-3 py-2 text-sm pointer-events-none z-10"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      >
        <p class="font-medium">{{ tooltip.label }}</p>
        <p class="text-white/70">{{ tooltip.value.toLocaleString() }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface BarItem {
  label: string
  value: number
}

interface Props {
  data: BarItem[]
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 300
})

const containerRef = ref<HTMLElement | null>(null)
const width = ref(600)
const padding = { top: 20, right: 20, bottom: 40, left: 50 }

const chartWidth = computed(() => width.value - padding.left - padding.right)
const chartHeight = computed(() => props.height - padding.top - padding.bottom)

const barWidth = computed(() => {
  const gap = 8
  const totalGap = (props.data.length - 1) * gap
  return Math.max(20, (chartWidth.value - totalGap) / props.data.length)
})

const maxValue = computed(() => {
  const max = Math.max(...props.data.map(d => d.value), 0)
  return Math.ceil(max * 1.1)
})

const yLabels = computed(() => {
  const step = maxValue.value / 5
  return Array.from({ length: 6 }, (_, i) => Math.round(i * step))
})

const getX = (index: number) => {
  const gap = 8
  return index * (barWidth.value + gap)
}

const getY = (value: number) => {
  return chartHeight.value - (value / maxValue.value) * chartHeight.value
}

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  label: '',
  value: 0
})

const showTooltip = (item: BarItem, event: MouseEvent) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  tooltip.value = {
    show: true,
    x: event.clientX - rect.left + 10,
    y: event.clientY - rect.top - 30,
    label: item.label,
    value: item.value
  }
}

const hideTooltip = () => {
  tooltip.value.show = false
}

const updateWidth = () => {
  if (containerRef.value) {
    width.value = containerRef.value.offsetWidth
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateWidth()
  if (containerRef.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
