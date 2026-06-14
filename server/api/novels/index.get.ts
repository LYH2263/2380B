import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'
import {
  performSearch,
  fallbackSearch,
  SEARCH_SCOPE,
  type SearchScope
} from '~/server/utils/searchService'

function getTagNames(novelTags: any[]) {
  return novelTags.map((nt: any) => nt.tag.name)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const user = getAuthUser(event)

  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 12
  const search = (query.search as string) || ''
  const tag = (query.tag as string) || ''
  const status = (query.status as string) || ''
  const sort = (query.sort as string) || 'latest'
  const scope = (query.scope as SearchScope) || SEARCH_SCOPE.TITLE_AND_DESCRIPTION

  const validScopes = Object.values(SEARCH_SCOPE)
  const safeScope = validScopes.includes(scope) ? scope : SEARCH_SCOPE.TITLE_AND_DESCRIPTION

  if (!search && !tag && !status) {
    const where: any = {}

    if (tag) {
      where.novelTags = {
        some: {
          tag: {
            name: {
              equals: tag,
              mode: 'insensitive'
            }
          }
        }
      }
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

    const [novels, total] = await Promise.all([
      prisma.novel.findMany({
        where,
        include: {
          author: {
            select: { id: true, username: true, avatar: true }
          },
          novelTags: {
            include: { tag: true }
          },
          _count: {
            select: {
              chapters: true,
              likes: true,
              favorites: true,
              subscriptions: true,
              ratings: true
            }
          },
          ratings: {
            select: { score: true }
          },
          ...(user ? {
            likes: {
              where: { userId: user.userId },
              select: { id: true }
            },
            favorites: {
              where: { userId: user.userId },
              select: { id: true }
            },
            subscriptions: {
              where: { userId: user.userId },
              select: { id: true }
            }
          } : {})
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.novel.count({ where })
    ])

    const novelsWithRating = novels.map(novel => {
      const avgRating = novel.ratings.length > 0
        ? novel.ratings.reduce((sum, r) => sum + r.score, 0) / novel.ratings.length
        : 0

      return {
        novelId: novel.id,
        title: novel.title,
        description: novel.description,
        cover: novel.cover,
        status: novel.status,
        tags: getTagNames(novel.novelTags),
        viewCount: novel.viewCount,
        avgRating: Math.round(avgRating * 10) / 10,
        totalHits: 0,
        author: novel.author,
        hits: [],
        _count: novel._count,
        isLiked: user ? (novel as any).likes?.length > 0 : false,
        isFavorited: user ? (novel as any).favorites?.length > 0 : false,
        isSubscribed: user ? (novel as any).subscriptions?.length > 0 : false
      }
    })

    return {
      novels: novelsWithRating,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      searchMeta: {
        scope: safeScope,
        usedFallback: false,
        queryParsed: null
      }
    }
  }

  const searchOptions = {
    page,
    limit,
    tag,
    status,
    sort,
    userId: user?.userId
  }

  let searchResult
  let usedFallback = false

  try {
    searchResult = await performSearch(search, safeScope, searchOptions)
  } catch (e: any) {
    console.warn('Full-text search failed, using fallback:', e.message)
    searchResult = await fallbackSearch(search, safeScope, searchOptions)
    usedFallback = true
  }

  return {
    novels: searchResult.results,
    pagination: searchResult.pagination,
    searchMeta: {
      scope: safeScope,
      usedFallback,
      query: search,
      parsedQuery: {
        hasSearch: !!search,
        hasAdvancedSyntax: search.includes('"') || search.includes('-') || search.includes('author:'),
        scope: safeScope
      }
    }
  }
})
