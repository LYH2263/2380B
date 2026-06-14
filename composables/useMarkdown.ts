import { marked } from 'marked'

export function useMarkdown() {
  const renderMarkdown = (content: string): string => {
    if (!content) return ''
    try {
      return marked.parse(content) as string
    } catch (e) {
      return escapeHtml(content)
    }
  }

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  const getPlainText = (content: string): string => {
    if (!content) return ''
    const html = renderMarkdown(content)
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
  }

  const wordCount = (content: string): number => {
    if (!content) return 0
    const plainText = getPlainText(content)
    return plainText.replace(/\s/g, '').length
  }

  return {
    renderMarkdown,
    escapeHtml,
    getPlainText,
    wordCount
  }
}
