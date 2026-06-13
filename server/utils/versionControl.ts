import prisma from '~/server/utils/prisma'

const MAX_VERSIONS_PER_CHAPTER = 50

interface DiffToken {
  type: 'equal' | 'insert' | 'delete'
  value: string
}

export function computeDiff(oldText: string, newText: string): DiffToken[] {
  const oldChars = [...oldText]
  const newChars = [...newText]
  const m = oldChars.length
  const n = newChars.length

  if (m === 0) {
    return [{ type: 'insert', value: newText }]
  }
  if (n === 0) {
    return [{ type: 'delete', value: oldText }]
  }

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldChars[i - 1] === newChars[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const tokens: DiffToken[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldChars[i - 1] === newChars[j - 1]) {
      tokens.unshift({ type: 'equal', value: oldChars[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ type: 'insert', value: newChars[j - 1] })
      j--
    } else {
      tokens.unshift({ type: 'delete', value: oldChars[i - 1] })
      i--
    }
  }

  return mergeAdjacentTokens(tokens)
}

function mergeAdjacentTokens(tokens: DiffToken[]): DiffToken[] {
  if (tokens.length === 0) return []

  const merged: DiffToken[] = []
  let current = { ...tokens[0] }

  for (let k = 1; k < tokens.length; k++) {
    if (tokens[k].type === current.type) {
      current.value += tokens[k].value
    } else {
      merged.push(current)
      current = { ...tokens[k] }
    }
  }
  merged.push(current)

  return merged
}

export function formatDiffAsHtml(diff: DiffToken[]): string {
  return diff
    .map((token) => {
      const escaped = escapeHtml(token.value).replace(/\n/g, '<br>')
      switch (token.type) {
        case 'insert':
          return `<span class="bg-green-500/30 text-green-300 rounded px-0.5">${escaped}</span>`
        case 'delete':
          return `<span class="bg-red-500/30 text-red-300 line-through rounded px-0.5">${escaped}</span>`
        default:
          return escaped
      }
    })
    .join('')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface CreateVersionOptions {
  chapterId: number
  title: string
  content: string
  createdById: number
  type?: 'FULL' | 'DIFF' | 'AUTO' | 'RESTORE'
  restoredFromVersionId?: number
}

export async function createChapterVersion(options: CreateVersionOptions) {
  const { chapterId, title, content, createdById, type = 'AUTO', restoredFromVersionId } = options

  const wordCount = content.replace(/\s/g, '').length

  const lastVersion = await prisma.chapterVersion.findFirst({
    where: { chapterId },
    orderBy: { versionNum: 'desc' }
  })

  const versionNum = (lastVersion?.versionNum || 0) + 1
  const wordDiff = lastVersion ? wordCount - lastVersion.wordCount : wordCount

  const version = await prisma.chapterVersion.create({
    data: {
      chapterId,
      versionNum,
      title,
      content,
      wordCount,
      wordDiff,
      type: type as any,
      restoredFromVersionId,
      createdById,
      isKeyNode: !lastVersion || versionNum === 1
    }
  })

  await optimizeVersions(chapterId)

  return version
}

export async function optimizeVersions(chapterId: number) {
  const total = await prisma.chapterVersion.count({ where: { chapterId } })

  if (total <= MAX_VERSIONS_PER_CHAPTER) return

  const versions = await prisma.chapterVersion.findMany({
    where: { chapterId },
    orderBy: { versionNum: 'asc' },
    select: { id: true, versionNum: true, isKeyNode: true, createdAt: true }
  })

  const first = versions[0]
  const last = versions[versions.length - 1]

  const step = Math.ceil(total / MAX_VERSIONS_PER_CHAPTER)

  const toKeep = new Set<number>()
  toKeep.add(first.id)
  toKeep.add(last.id)

  for (let i = 1; i < versions.length - 1; i++) {
    const v = versions[i]
    if (v.isKeyNode || v.versionNum % step === 0) {
      toKeep.add(v.id)
    }
  }

  const toDeleteIds = versions.filter((v) => !toKeep.has(v.id)).map((v) => v.id)

  if (toDeleteIds.length > 0) {
    await prisma.chapterVersion.deleteMany({
      where: { id: { in: toDeleteIds } }
    })
  }

  await prisma.chapterVersion.updateMany({
    where: { id: { in: Array.from(toKeep) } },
    data: { isKeyNode: true }
  })
}

export async function softDeleteChapter(chapterId: number, deletedBy: number) {
  return prisma.chapter.update({
    where: { id: chapterId },
    data: {
      deletedAt: new Date(),
      deletedBy
    }
  })
}

export async function restoreChapterFromTrash(chapterId: number) {
  return prisma.chapter.update({
    where: { id: chapterId },
    data: {
      deletedAt: null,
      deletedBy: null
    }
  })
}

export async function permanentlyDeleteExpiredChapters() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return prisma.chapter.deleteMany({
    where: {
      deletedAt: {
        not: null,
        lt: thirtyDaysAgo
      }
    }
  })
}
