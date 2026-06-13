<template>
  <div class="w-full h-full" ref="containerRef">
    <svg :width="width" :height="height" class="overflow-visible">
      <defs>
        <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(139, 92, 246, 0.3)" />
          <stop offset="100%" stop-color="rgba(139, 92, 246, 0)" />
        </linearGradient>
        <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(236, 72, 153, 0.3)" />
          <stop offset="100%" stop-color="rgba(236, 72, 153, 0)" />
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
        
        <g v-if="showArea">
          <path
            v-for="(series, idx) in series"
            :key="'area-' + idx"
            :d="getAreaPath(series.data)"
            :fill="`url(#lineGradient${idx + 1})`"
          />
        </g>
        
        <g>
          <path
            v-for="(series, idx) in series"
            :key="'line-' + idx"
            :d="getLinePath(series.data)"
            fill="none"
            :stroke="series.color || colors[idx]"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>
        
        <g>
          <template v-for="(series, seriesIdx) in series" :key="'points-' + seriesIdx">
            <g v-for="(point, pointIdx) in series.data" :key="'point-' + seriesIdx + '-' + pointIdx">
              <circle
                :cx="getX(pointIdx)"
                :cy="getY(point.value, series.data)"
                r="3"
                :fill="series.color || colors[seriesIdx]"
                class="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                @mouseenter="showTooltip(point, series, $event)"
                @mouseleave="hideTooltip"
              />
            </g>
          </template>
        </g>
        
        <g class="x-axis">
          <text
            v-for="(label, idx) in xLabels"
            :key="'x-' + idx"
            :x="getX(idx)"
            :y="chartHeight + 20"
            text-anchor="middle"
            fill="rgba(255,255,255,0.5)"
            font-size="10"
          >
            {{ label }}
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
      
      <g v-if="legend" :transform="`translate(${padding.left}, 10)`">
        <g v-for="(series, idx) in series" :key="'legend-' + idx" :transform="`translate(${idx * 100}, 0)`">
          <rect :width="12" :height="12" rx="2" :fill="series.color || colors[idx]" />
          <text x="18" y="10" fill="rgba(255,255,255,0.7)" font-size="12">{{ series.name }}</text>
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
        <p class="text-white/70">{{ tooltip.seriesName }}: {{ tooltip.value }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface DataPoint {
  value: number
  label?: string
}

interface Series {
  name: string
  data: DataPoint[]
  color?: string
}

interface Props {
  series: Series[]
  xLabels?: string[]
  height?: number
  showArea?: boolean
  legend?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
  showArea: true,
  legend: true
})

const containerRef = ref<HTMLElement | null>(null)
const width = ref(600)
const padding = { top: 40, right: 20, bottom: 40, left: 50 }

const colors = ['#8b5cf6', '#ec4899']

const chartWidth = computed(() => width.value - padding.left - padding.right)
const chartHeight = computed(() => props.height - padding.top - padding.bottom)

const allValues = computed(() => {
  return props.series.flatMap(s => s.data.map(d => d.value))
})

const maxValue = computed(() => {
  const max = Math.max(...allValues.value, 0)
  return Math.ceil(max * 1.1)
})

const yLabels = computed(() => {
  const step = maxValue.value / 5
  return Array.from({ length: 6 }, (_, i) => Math.round(i * step))
})

const labels = computed(() => {
  if (props.xLabels) return props.xLabels
  return props.series[0]?.data.map((d, i) => d.label || String(i + 1)) || []
})

const getX = (index: number) => {
  const dataLength = props.series[0]?.data.length || 1
  return (chartWidth.value / (dataLength - 1 || 1)) * index
}

const getY = (value: number, data: DataPoint[]) => {
  const max = Math.max(...data.map(d => d.value), 1)
  return chartHeight.value - (value / max) * chartHeight.value
}

const getLinePath = (data: DataPoint[]) => {
  if (!data.length) return ''
  
  const points = data.map((d, i) => `${getX(i)},${getY(d.value, data)}`)
  return `M ${points.join(' L ')}`
}

const getAreaPath = (data: DataPoint[]) => {
  if (!data.length) return ''
  
  const points = data.map((d, i) => `${getX(i)},${getY(d.value, data)}`)
  const lastX = getX(data.length - 1)
  return `M 0,${chartHeight.value} L ${points.join(' L ')} L ${lastX},${chartHeight.value} Z`
}

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  label: '',
  value: '',
  seriesName: ''
})

const showTooltip = (point: DataPoint, series: Series, event: MouseEvent) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  tooltip.value = {
    show: true,
    x: event.clientX - rect.left + 10,
    y: event.clientY - rect.top - 30,
    label: point.label || '',
    value: point.value.toLocaleString(),
    seriesName: series.name
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
