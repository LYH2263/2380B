<template>
  <span class="inline" v-html="renderedHtml"></span>
</template>

<script setup lang="ts">
const props = defineProps<{
  text: string
  highlightStart?: string
  highlightEnd?: string
}>()

const renderedHtml = computed(() => {
  let result = props.text || ''
  const startTag = props.highlightStart || '|||HIGHLIGHT_START|||'
  const endTag = props.highlightEnd || '|||HIGHLIGHT_END|||'

  const startRegex = new RegExp(startTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
  const endRegex = new RegExp(endTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')

  result = result.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  result = result
    .replace(startRegex, '<mark class="bg-yellow-400/40 text-yellow-200 px-0.5 rounded">')
    .replace(endRegex, '</mark>')

  return result
})
</script>
