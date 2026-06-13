<template>
  <div class="w-full" ref="containerRef">
    <svg :width="width" :height="height" class="overflow-visible">
      <defs>
        <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(139, 92, 246, 0.8)" />
          <stop offset="100%" stop-color="rgba(236, 72, 153, 0.8)" />
        </linearGradient>
      </defs>
      
      <g :transform="`translate(${padding.left}, ${padding.top})`">
        <g v-for="(item, idx) in data" :key="idx">
          <path
            :d="getFunnelPath(idx)"
            fill="url(#funnelGradient)"
            opacity="0.9"
            class="hover:opacity-100 transition-opacity cursor-pointer"
            @mouseenter="showTooltip(item, idx, $event)"
            @mouseleave="hideTooltip"
          />
          
          <text
            :x="chartWidth / 2"
            :y="getY(idx) + itemHeight / 2 + 4"
            text-anchor="middle"
            fill="white"
            font-size="14"
            font-weight="600"
          >
            {{ item.name }}
          </text>
          
          <text
            :x="chartWidth / 2"
            :y="getY(idx) + itemHeight / 2 + 22"
            text-anchor="middle"
            fill="rgba(255,255,255,0.8)"
            font-size="12"
          >
            {{ item.value.toLocaleString() }}
            <tspan fill="rgba(255,255,255,0.5)" v-if="idx > 0">
              ({{ conversionRates[idx] }}%)
            </tspan>
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
        <p class="font-medium">{{ tooltip.name }}</p>
        <p class="text-white/70">数量: {{ tooltip.value.toLocaleString() }}</p>
        <p v-if="tooltip.conversion !== null" class="text-white/70">转化率: {{ tooltip.conversion }}%</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface FunnelItem {
  name: string
  value: number
}

interface Props {
  data: FunnelItem[]
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 300
})

const containerRef = ref<HTMLElement | null>(null)
const width = ref(600)
const padding = { top: 20, right: 40, bottom: 20, left: 40 }

const chartWidth = computed(() => width.value - padding.left - padding.right)
const chartHeight = computed(() => props.height - padding.top - padding.bottom)

const itemHeight = computed(() => chartHeight.value / props.data.length)

const maxValue = computed(() => Math.max(...props.data.map(d => d.value), 1))

const conversionRates = computed(() => {
  const rates: string[] = ['100']
  for (let i = 1; i < props.data.length; i++) {
    const prev = props.data[i - 1].value
    const curr = props.data[i].value
    const rate = prev > 0 ? (curr / prev) * 100 : 0
    rates.push(rate.toFixed(1))
  }
  return rates
})

const getWidth = (value: number) => {
  return Math.max(40, (value / maxValue.value) * chartWidth.value)
}

const getY = (index: number) => {
  return index * itemHeight.value
}

const getFunnelPath = (index: number) => {
  const item = props.data[index]
  const nextItem = props.data[index + 1] || item
  
  const y1 = getY(index)
  const y2 = y1 + itemHeight.value
  
  const w1 = getWidth(item.value)
  const w2 = getWidth(nextItem.value)
  
  const x1 = (chartWidth.value - w1) / 2
  const x2 = (chartWidth.value - w2) / 2
  
  return `
    M ${x1} ${y1}
    L ${x1 + w1} ${y1}
    L ${x2 + w2} ${y2}
    L ${x2} ${y2}
    Z
  `
}

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  name: '',
  value: 0,
  conversion: null as string | null
})

const showTooltip = (item: FunnelItem, index: number, event: MouseEvent) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  tooltip.value = {
    show: true,
    x: event.clientX - rect.left + 10,
    y: event.clientY - rect.top - 30,
    name: item.name,
    value: item.value,
    conversion: index > 0 ? conversionRates.value[index] : null
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
