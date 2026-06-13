import prisma from './prisma'

export const SEARCH_SCOPE = {
  TITLE_ONLY: 'title',
  TITLE_AND_DESCRIPTION: 'title_desc',
  FULL_TEXT: 'full'
} as const

export type SearchScope = typeof SEARCH_SCOPE[keyof typeof SEARCH_SCOPE]

export interface ParsedSearchQuery {
  includeTerms: string[]
  excludeTerms: string[]
  exactPhrases: string[]
  authorFilter?: string
  rawQuery: string
}

export interface SearchHit {
  type: 'title' | 'description' | 'chapter_title' | 'chapter_content'
  novelId: number
  chapterId?: number
  segmentId?: number
  matchedText: string
  snippet: string
  startOffset?: number
  endOffset?: number
  chapterTitle?: string
  chapterOrder?: number
  relevance: number
}

export interface AggregatedSearchResult {
  novelId: number
  title: string
  description: string
  cover?: string | null
  status: string
  tags: string[]
  viewCount: number
  avgRating: number
  totalHits: number
  author?: {
    id: number
    username: string
    avatar?: string | null
  }
  hits: SearchHit[]
  _count?: {
    chapters: number
    likes: number
    favorites: number
    subscriptions: number
    ratings: number
  }
  isLiked?: boolean
  isFavorited?: boolean
  isSubscribed?: boolean
}

const SEGMENT_LENGTH = 2000
const SNIPPET_CONTEXT = 50

export function parseSearchQuery(rawQuery: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = {
    includeTerms: [],
    excludeTerms: [],
    exactPhrases: [],
    rawQuery: rawQuery.trim()
  }

  if (!result.rawQuery) return result

  let remaining = result.rawQuery
  const phraseRegex = /"([^"]+)"/g
  let match

  while ((match = phraseRegex.exec(remaining)) !== null) {
    result.exactPhrases.push(match[1].trim())
  }
  remaining = remaining.replace(phraseRegex, ' ')

  const authorRegex = /author:(\S+)/g
  while ((match = authorRegex.exec(remaining)) !== null) {
    result.authorFilter = match[1]
  }
  remaining = remaining.replace(authorRegex, ' ')

  const tokens = remaining.split(/\s+/).filter(t => t.length > 0)
  for (const token of tokens) {
    if (token.startsWith('-') && token.length > 1) {
      result.excludeTerms.push(token.slice(1))
    } else {
      result.includeTerms.push(token)
    }
  }

  return result
}

export async function buildChapterSegments(chapterId: number): Promise<void> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, novelId: true, content: true }
  })

  if (!chapter) return

  await prisma.chapterSegment.deleteMany({
    where: { chapterId: chapter.id }
  })

  const content = chapter.content || ''
  const totalLength = content.length

  if (totalLength === 0) return

  if (totalLength <= SEGMENT_LENGTH) {
    await prisma.chapterSegment.create({
      data: {
        novelId: chapter.novelId,
        chapterId: chapter.id,
        segmentIndex: 0,
        content: content,
        startOffset: 0,
        endOffset: totalLength
      }
    })
    return
  }

  const segments: Array<{
    segmentIndex: number
    content: string
    startOffset: number
    endOffset: number
  }> = []

  let offset = 0
  let segIndex = 0

  while (offset < totalLength) {
    let end = Math.min(offset + SEGMENT_LENGTH, totalLength)

    if (end < totalLength) {
      let searchStart = Math.max(offset + SEGMENT_LENGTH - 200, offset)

      let punctIdx = -1
      for (let i = end; i >= searchStart; i--) {
        const ch = content[i]
        if (ch === '\n' || ch === '。' || ch === '！' || ch === '？' || ch === '.' || ch === '!' || ch === '?') {
          punctIdx = i + 1
          break
        }
      }

      if (punctIdx > offset + 100) {
        end = punctIdx
      }
    }

    segments.push({
      segmentIndex: segIndex,
      content: content.substring(offset, end),
      startOffset: offset,
      endOffset: end
    })

    offset = end
    segIndex++
  }

  await prisma.chapterSegment.createMany({
    data: segments.map(seg => ({
      novelId: chapter.novelId,
      chapterId: chapter.id,
      segmentIndex: seg.segmentIndex,
      content: seg.content,
      startOffset: seg.startOffset,
      endOffset: seg.endOffset
    }))
  })
}

export async function rebuildAllSegments(): Promise<{ processed: number }> {
  const chapters = await prisma.chapter.findMany({
    select: { id: true }
  })

  for (const ch of chapters) {
    await buildChapterSegments(ch.id)
  }

  return { processed: chapters.length }
}

function extractSnippet(
  content: string,
  searchTerms: string[],
  exactPhrases: string[]
): {
  snippet: string
  matchedText: string
  startOffset: number
  endOffset: number
} | null {
  if (!content) return null

  const allSearchPatterns: string[] = [...searchTerms, ...exactPhrases].filter(p => p.length > 0)

  if (allSearchPatterns.length === 0) return null

  let bestMatch: {
    start: number
    end: number
    matchedText: string
  } | null = null

  for (const pattern of allSearchPatterns) {
    const lowerContent = content.toLowerCase()
    const lowerPattern = pattern.toLowerCase()

    let idx = lowerContent.indexOf(lowerPattern)
    if (idx !== -1) {
      const matchEnd = idx + pattern.length
      if (!bestMatch || idx < bestMatch.start) {
        bestMatch = {
          start: idx,
          end: matchEnd,
          matchedText: content.substring(idx, matchEnd)
        }
        break
      }
    }
  }

  if (!bestMatch) return null

  const snippetStart = Math.max(0, bestMatch.start - SNIPPET_CONTEXT)
  const snippetEnd = Math.min(content.length, bestMatch.end + SNIPPET_CONTEXT)

  let snippet = content.substring(snippetStart, snippetEnd)
  if (snippetStart > 0) snippet = '...' + snippet
  if (snippetEnd < content.length) snippet = snippet + '...'

  return {
    snippet,
    matchedText: bestMatch.matchedText,
    startOffset: bestMatch.start,
    endOffset: bestMatch.end
  }
}

function highlightKeywords(text: string, searchTerms: string[], exactPhrases: string[]): string {
  const allPatterns: string[] = [...searchTerms, ...exactPhrases].filter(p => p.length > 0)
  if (allPatterns.length === 0) return text

  const escaped = allPatterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')

  return text.replace(regex, '|||HIGHLIGHT_START|||$1|||HIGHLIGHT_END|||')
}

function calculateRelevance(
  hitType: SearchHit['type'],
  matchCount: number,
  isExact: boolean
): number {
  const baseWeights: Record<SearchHit['type'], number> = {
    title: 100,
    chapter_title: 90,
    description: 80,
    chapter_content: 70
  }

  let relevance = baseWeights[hitType] || 50
  relevance += Math.min(matchCount * 5, 25)
  if (isExact) relevance += 20

  return relevance
}

export async function performSearch(
  query: string,
  scope: SearchScope = SEARCH_SCOPE.TITLE_AND_DESCRIPTION,
  options: {
    page?: number
    limit?: number
    tag?: string
    status?: string
    sort?: string
    userId?: number
  } = {}
): Promise<{
  results: AggregatedSearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}> {
  return fallbackSearch(query, scope, options)
}

export async function fallbackSearch(
  query: string,
  scope: SearchScope,
  options: {
    page?: number
    limit?: number
    tag?: string
    status?: string
    sort?: string
    userId?: number
  } = {}
): Promise<{
  results: AggregatedSearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}> {
  const { page = 1, limit = 12, tag, status, sort = 'latest', userId } = options
  const parsed = parseSearchQuery(query)

  const where: any = {}

  const searchTerms = [...parsed.includeTerms, ...parsed.exactPhrases].filter(t => t.length > 0)

  if (searchTerms.length > 0) {
    const orConditions: any[] = []

    for (const term of searchTerms) {
      orConditions.push({ title: { contains: term, mode: 'insensitive' as const } })
    }

    if (scope !== SEARCH_SCOPE.TITLE_ONLY) {
      for (const term of searchTerms) {
        orConditions.push({ description: { contains: term, mode: 'insensitive' as const } })
      }
    }

    if (scope === SEARCH_SCOPE.FULL_TEXT) {
      for (const term of searchTerms) {
        orConditions.push({
          chapters: {
            some: {
              OR: [
                { title: { contains: term, mode: 'insensitive' as const } },
                { content: { contains: term, mode: 'insensitive' as const } }
              ]
            }
          }
        })
      }
    }

    where.OR = orConditions
  }

  if (parsed.excludeTerms.length > 0) {
    const notConditions: any[] = []
    for (const term of parsed.excludeTerms) {
      notConditions.push({ title: { not: { contains: term, mode: 'insensitive' as const } } })
      notConditions.push({ description: { not: { contains: term, mode: 'insensitive' as const } } })
    }
    if (where.AND) {
      where.AND.push(...notConditions)
    } else {
      where.AND = notConditions
    }
  }

  if (parsed.authorFilter) {
    where.author = {
      username: { contains: parsed.authorFilter, mode: 'insensitive' as const }
    }
  }

  if (tag) {
    where.tags = { has: tag }
  }

  if (status && ['ONGOING', 'COMPLETED', 'HIATUS'].includes(status)) {
    where.status = status
  }

  const orderBy: any = {}
  switch (sort) {
    case 'popular':
      orderBy.viewCount = 'desc'
      break
    case 'rating':
      orderBy.ratings = { _count: 'desc' }
      break
    default:
      orderBy.createdAt = 'desc'
  }

  const needChapters = scope === SEARCH_SCOPE.FULL_TEXT && searchTerms.length > 0

  const [novels, total] = await Promise.all([
    prisma.novel.findMany({
      where,
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        chapters: needChapters ? {
          select: {
            id: true,
            title: true,
            order: true,
            content: true
          }
        } : false,
        _count: {
          select: {
            chapters: true,
            likes: true,
            favorites: true,
            subscriptions: true,
            ratings: true
          }
        },
        ratings: { select: { score: true } },
        ...(userId ? {
          likes: { where: { userId }, select: { id: true } },
          favorites: { where: { userId }, select: { id: true } },
          subscriptions: { where: { userId }, select: { id: true } }
        } : {})
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.novel.count({ where })
  ])

  const allSearchTerms = [...parsed.includeTerms, ...parsed.exactPhrases]

  const results: AggregatedSearchResult[] = novels.map(novel => {
    const hits: SearchHit[] = []
    const seenHits = new Set<string>()

    const addHit = (key: string, hit: SearchHit) => {
      if (seenHits.has(key)) return
      seenHits.add(key)
      hits.push(hit)
    }

    for (const term of allSearchTerms) {
      const lowerTitle = novel.title.toLowerCase()
      const lowerTerm = term.toLowerCase()
      const titleIdx = lowerTitle.indexOf(lowerTerm)
      if (titleIdx !== -1) {
        const isExact = parsed.exactPhrases.includes(term)
        addHit(`title_${titleIdx}`, {
          type: 'title',
          novelId: novel.id,
          matchedText: novel.title.substring(titleIdx, titleIdx + term.length),
          snippet: novel.title,
          relevance: calculateRelevance('title', 1, isExact),
          startOffset: titleIdx,
          endOffset: titleIdx + term.length
        })
      }

      if (scope !== SEARCH_SCOPE.TITLE_ONLY) {
        const lowerDesc = novel.description.toLowerCase()
        const descIdx = lowerDesc.indexOf(lowerTerm)
        if (descIdx !== -1) {
          const snippetData = extractSnippet(novel.description, allSearchTerms, parsed.exactPhrases)
          const isExact = parsed.exactPhrases.includes(term)
          if (snippetData) {
            addHit(`desc_${descIdx}`, {
              type: 'description',
              novelId: novel.id,
              matchedText: snippetData.matchedText,
              snippet: snippetData.snippet,
              relevance: calculateRelevance('description', 1, isExact),
              startOffset: snippetData.startOffset,
              endOffset: snippetData.endOffset
            })
          }
        }
      }

      if (scope === SEARCH_SCOPE.FULL_TEXT && novel.chapters) {
        for (const chapter of novel.chapters) {
          const lowerChapterTitle = chapter.title.toLowerCase()
          const chapterTitleIdx = lowerChapterTitle.indexOf(lowerTerm)
          if (chapterTitleIdx !== -1) {
            const isExact = parsed.exactPhrases.includes(term)
            addHit(`cht_${chapter.id}_${chapterTitleIdx}`, {
              type: 'chapter_title',
              novelId: novel.id,
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              chapterOrder: chapter.order,
              matchedText: chapter.title.substring(chapterTitleIdx, chapterTitleIdx + term.length),
              snippet: chapter.title,
              relevance: calculateRelevance('chapter_title', 1, isExact),
              startOffset: chapterTitleIdx,
              endOffset: chapterTitleIdx + term.length
            })
          }

          const lowerContent = chapter.content.toLowerCase()
          const contentIdx = lowerContent.indexOf(lowerTerm)
          if (contentIdx !== -1) {
            const snippetData = extractSnippet(chapter.content, allSearchTerms, parsed.exactPhrases)
            const isExact = parsed.exactPhrases.includes(term)
            if (snippetData) {
              addHit(`chc_${chapter.id}_${snippetData.startOffset}`, {
                type: 'chapter_content',
                novelId: novel.id,
                chapterId: chapter.id,
                chapterTitle: chapter.title,
                chapterOrder: chapter.order,
                matchedText: snippetData.matchedText,
                snippet: snippetData.snippet,
                relevance: calculateRelevance('chapter_content', 1, isExact),
                startOffset: snippetData.startOffset,
                endOffset: snippetData.endOffset
              })
            }
          }
        }
      }
    }

    const processedHits = hits
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 50)
      .map(hit => ({
        ...hit,
        snippet: highlightKeywords(hit.snippet, parsed.includeTerms, parsed.exactPhrases),
        matchedText: highlightKeywords(hit.matchedText, parsed.includeTerms, parsed.exactPhrases)
      }))

    const avgRating = novel.ratings.length > 0
      ? novel.ratings.reduce((sum, r) => sum + r.score, 0) / novel.ratings.length
      : 0

    return {
      novelId: novel.id,
      title: highlightKeywords(novel.title, parsed.includeTerms, parsed.exactPhrases),
      description: novel.description,
      cover: novel.cover,
      status: novel.status,
      tags: novel.tags,
      viewCount: novel.viewCount,
      avgRating: Math.round(avgRating * 10) / 10,
      totalHits: processedHits.length,
      author: novel.author,
      hits: processedHits,
      _count: novel._count,
      isLiked: userId ? (novel as any).likes?.length > 0 : false,
      isFavorited: userId ? (novel as any).favorites?.length > 0 : false,
      isSubscribed: userId ? (novel as any).subscriptions?.length > 0 : false
    }
  })

  if (searchTerms.length > 0) {
    results.sort((a, b) => {
      if (b.totalHits !== a.totalHits) return b.totalHits - a.totalHits
      const maxRelA = a.hits[0]?.relevance || 0
      const maxRelB = b.hits[0]?.relevance || 0
      return maxRelB - maxRelA
    })
  }

  return {
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export { SEARCH_SCOPE as default }
