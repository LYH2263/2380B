import prisma from './prisma'
import type { TagCategory, RelationSource } from '@prisma/client'

export interface TagWithStats {
  id: number
  name: string
  description: string | null
  category: TagCategory
  isCanonical: boolean
  canonicalId: number | null
  useCount: number
  canonical?: { id: number; name: string } | null
  aliases?: { id: number; name: string }[]
}

export async function getTagById(id: number) {
  return prisma.tag.findUnique({
    where: { id },
    include: {
      canonical: { select: { id: true, name: true } },
      aliases: { select: { id: true, name: true } }
    }
  })
}

export async function getTagByName(name: string) {
  return prisma.tag.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive'
      }
    }
  })
}

export async function getTags(params: {
  page?: number
  limit?: number
  search?: string
  category?: TagCategory
  onlyCanonical?: boolean
  sortBy?: 'name' | 'useCount' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}) {
  const {
    page = 1,
    limit = 20,
    search = '',
    category,
    onlyCanonical = false,
    sortBy = 'useCount',
    sortOrder = 'desc'
  } = params

  const where: any = {}

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive'
    }
  }

  if (category) {
    where.category = category
  }

  if (onlyCanonical) {
    where.isCanonical = true
  }

  const orderBy: any = {}
  orderBy[sortBy] = sortOrder

  const [tags, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      include: {
        canonical: { select: { id: true, name: true } },
        _count: {
          select: { aliases: true }
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.tag.count({ where })
  ])

  return {
    tags,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export async function getPopularTags(limit: number = 30, category?: TagCategory) {
  const where: any = { isCanonical: true }
  if (category) {
    where.category = category
  }

  return prisma.tag.findMany({
    where,
    orderBy: { useCount: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      category: true,
      useCount: true
    }
  })
}

export async function searchTags(query: string, limit: number = 10, onlyCanonical: boolean = true) {
  if (!query.trim()) return []

  const where: any = {
    name: {
      startsWith: query,
      mode: 'insensitive'
    }
  }

  if (onlyCanonical) {
    where.isCanonical = true
  }

  const startsWithTags = await prisma.tag.findMany({
    where,
    orderBy: [
      { useCount: 'desc' },
      { name: 'asc' }
    ],
    take: limit,
    select: {
      id: true,
      name: true,
      category: true,
      useCount: true
    }
  })

  if (startsWithTags.length >= limit) {
    return startsWithTags
  }

  const containsWhere: any = {
    name: {
      contains: query,
      mode: 'insensitive'
    },
    ...(onlyCanonical ? { isCanonical: true } : {})
  }

  if (startsWithTags.length > 0) {
    containsWhere.id = {
      notIn: startsWithTags.map(t => t.id)
    }
  }

  const containsTags = await prisma.tag.findMany({
    where: containsWhere,
    orderBy: [
      { useCount: 'desc' },
      { name: 'asc' }
    ],
    take: limit - startsWithTags.length,
    select: {
      id: true,
      name: true,
      category: true,
      useCount: true
    }
  })

  return [...startsWithTags, ...containsTags]
}

export async function createTag(data: {
  name: string
  description?: string
  category?: TagCategory
  canonicalId?: number
}) {
  const { name, description, category = 'OTHER', canonicalId } = data

  const existingTag = await getTagByName(name)
  if (existingTag) {
    throw new Error('标签已存在')
  }

  const tag = await prisma.tag.create({
    data: {
      name: name.trim(),
      description: description || null,
      category,
      isCanonical: !canonicalId,
      canonicalId: canonicalId || null
    }
  })

  if (canonicalId) {
    await prisma.tag.update({
      where: { id: canonicalId },
      data: { updatedAt: new Date() }
    })
  }

  return tag
}

export async function updateTag(id: number, data: {
  name?: string
  description?: string
  category?: TagCategory
  canonicalId?: number | null
}) {
  const { name, description, category, canonicalId } = data

  if (name) {
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: id }
      }
    })
    if (existingTag) {
      throw new Error('标签名称已存在')
    }
  }

  const updateData: any = {}
  if (name !== undefined) updateData.name = name.trim()
  if (description !== undefined) updateData.description = description || null
  if (category !== undefined) updateData.category = category
  if (canonicalId !== undefined) {
    updateData.canonicalId = canonicalId
    updateData.isCanonical = !canonicalId
  }

  return prisma.tag.update({
    where: { id },
    data: updateData
  })
}

export async function deleteTag(id: number) {
  const tag = await prisma.tag.findUnique({ where: { id } })
  if (!tag) {
    throw new Error('标签不存在')
  }

  if (tag.isCanonical) {
    const aliasCount = await prisma.tag.count({ where: { canonicalId: id } })
    if (aliasCount > 0) {
      throw new Error('该标签有别名标签，请先处理别名后再删除')
    }
  }

  return prisma.tag.delete({ where: { id } })
}

export async function mergeTags(fromTagIds: number[], toTagId: number) {
  const toTag = await prisma.tag.findUnique({ where: { id: toTagId } })
  if (!toTag) {
    throw new Error('目标标签不存在')
  }

  if (fromTagIds.includes(toTagId)) {
    throw new Error('不能合并到自身')
  }

  return prisma.$transaction(async (tx) => {
    for (const fromId of fromTagIds) {
      const fromTag = await tx.tag.findUnique({ where: { id: fromId } })
      if (!fromTag) continue

      const novelTags = await tx.novelTag.findMany({
        where: { tagId: fromId },
        select: { novelId: true }
      })

      for (const { novelId } of novelTags) {
        const existing = await tx.novelTag.findUnique({
          where: { novelId_tagId: { novelId, tagId: toTagId } }
        })
        if (!existing) {
          await tx.novelTag.create({
            data: { novelId, tagId: toTagId }
          })
        }
      }

      await tx.novelTag.deleteMany({ where: { tagId: fromId } })

      await tx.tagRelation.deleteMany({
        where: { OR: [{ tagId: fromId }, { relatedTagId: fromId }] }
      })

      await tx.tag.update({
        where: { id: fromId },
        data: {
          canonicalId: toTagId,
          isCanonical: false
        }
      })
    }

    await updateTagUseCount(toTagId, tx)

    return tx.tag.findUnique({
      where: { id: toTagId },
      include: { aliases: { select: { id: true, name: true } } }
    })
  })
}

export async function updateNovelTags(novelId: number, tagNames: string[]) {
  return prisma.$transaction(async (tx) => {
    const existingNovelTags = await tx.novelTag.findMany({
      where: { novelId },
      include: { tag: true }
    })

    const existingTagIds = existingNovelTags.map(nt => nt.tagId)

    const tagIdsToKeep: number[] = []

    for (const tagName of tagNames) {
      const trimmedName = tagName.trim()
      if (!trimmedName) continue

      let tag = await tx.tag.findFirst({
        where: { name: { equals: trimmedName, mode: 'insensitive' } }
      })

      if (!tag) {
        tag = await tx.tag.create({
          data: {
            name: trimmedName,
            category: 'OTHER',
            isCanonical: true
          }
        })
      } else if (!tag.isCanonical && tag.canonicalId) {
        const canonicalTag = await tx.tag.findUnique({
          where: { id: tag.canonicalId }
        })
        if (canonicalTag) {
          tag = canonicalTag
        }
      }

      tagIdsToKeep.push(tag.id)

      if (!existingTagIds.includes(tag.id)) {
        await tx.novelTag.create({
          data: { novelId, tagId: tag.id }
        })
      }
    }

    const tagIdsToRemove = existingTagIds.filter(id => !tagIdsToKeep.includes(id))
    if (tagIdsToRemove.length > 0) {
      await tx.novelTag.deleteMany({
        where: {
          novelId,
          tagId: { in: tagIdsToRemove }
        }
      })
    }

    const allAffectedTagIds = [...new Set([...existingTagIds, ...tagIdsToKeep])]
    for (const tagId of allAffectedTagIds) {
      await updateTagUseCount(tagId, tx)
    }

    return tx.novelTag.findMany({
      where: { novelId },
      include: { tag: true }
    })
  })
}

async function updateTagUseCount(tagId: number, tx: any = prisma) {
  const count = await tx.novelTag.count({ where: { tagId } })
  return tx.tag.update({
    where: { id: tagId },
    data: { useCount: count }
  })
}

export async function getNovelTagNames(novelId: number) {
  const novelTags = await prisma.novelTag.findMany({
    where: { novelId },
    include: { tag: true }
  })
  return novelTags.map(nt => nt.tag.name)
}

export async function getRelatedTags(tagId: number, limit: number = 10) {
  const directRelations = await prisma.tagRelation.findMany({
    where: { tagId },
    orderBy: { similarity: 'desc' },
    take: limit,
    include: {
      relatedTag: {
        select: { id: true, name: true, category: true, useCount: true }
      }
    }
  })

  if (directRelations.length > 0) {
    return directRelations.map(r => ({
      ...r.relatedTag,
      similarity: r.similarity,
      coOccurrence: r.coOccurrence
    }))
  }

  const coOccurrence = await calculateCoOccurrence(tagId, limit)
  return coOccurrence
}

async function calculateCoOccurrence(tagId: number, limit: number) {
  const novelTags = await prisma.novelTag.findMany({
    where: { tagId },
    select: { novelId: true }
  })

  const novelIds = novelTags.map(nt => nt.novelId)
  if (novelIds.length === 0) return []

  const relatedNovelTags = await prisma.novelTag.findMany({
    where: {
      novelId: { in: novelIds },
      tagId: { not: tagId }
    },
    select: { tagId: true, tag: { select: { id: true, name: true, category: true, useCount: true } } }
  })

  const tagCounts: Record<number, { count: number; tag: any }> = {}
  for (const nt of relatedNovelTags) {
    if (!tagCounts[nt.tagId]) {
      tagCounts[nt.tagId] = { count: 0, tag: nt.tag }
    }
    tagCounts[nt.tagId].count++
  }

  return Object.values(tagCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(item => ({
      ...item.tag,
      similarity: item.count / novelIds.length,
      coOccurrence: item.count
    }))
}

export async function updateTagRelations(tagId: number, source: RelationSource = 'CO_OCCURRENCE') {
  const relatedTags = await calculateCoOccurrence(tagId, 20)

  return prisma.$transaction(async (tx) => {
    for (const related of relatedTags) {
      const existing = await tx.tagRelation.findUnique({
        where: { tagId_relatedTagId: { tagId, relatedTagId: related.id } }
      })

      const data = {
        similarity: related.similarity,
        coOccurrence: related.coOccurrence,
        source
      }

      if (existing) {
        await tx.tagRelation.update({
          where: { id: existing.id },
          data: { ...data, updatedAt: new Date() }
        })
      } else {
        await tx.tagRelation.create({
          data: {
            tagId,
            relatedTagId: related.id,
            ...data
          }
        })
      }

      const reverseExisting = await tx.tagRelation.findUnique({
        where: { tagId_relatedTagId: { tagId: related.id, relatedTagId: tagId } }
      })

      if (reverseExisting) {
        await tx.tagRelation.update({
          where: { id: reverseExisting.id },
          data: { ...data, updatedAt: new Date() }
        })
      } else {
        await tx.tagRelation.create({
          data: {
            tagId: related.id,
            relatedTagId: tagId,
            ...data
          }
        })
      }
    }
  })
}

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '什么', '怎么', '为什么', '可以', '这个', '那个', '他', '她',
  '它', '们', '但是', '因为', '所以', '如果', '虽然', '然而', '而且', '或者',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out',
  'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'but', 'and', 'or', 'if', 'because'
])

export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  if (!text) return []

  const words = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w))

  const wordFreq: Record<string, number> = {}
  for (const word of words) {
    wordFreq[word] = (wordFreq[word] || 0) + 1
  }

  const chinesePattern = /[\u4e00-\u9fa5]{2,}/g
  const chineseMatches = text.match(chinesePattern) || []
  for (const match of chineseMatches) {
    for (let len = 2; len <= Math.min(4, match.length); len++) {
      for (let i = 0; i <= match.length - len; i++) {
        const phrase = match.substring(i, i + len)
        if (!STOP_WORDS.has(phrase)) {
          wordFreq[phrase] = (wordFreq[phrase] || 0) + (5 - len)
        }
      }
    }
  }

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word)
}

export async function recommendTags(title: string, description: string, limit: number = 10) {
  const keywords = extractKeywords(title + ' ' + description, 20)
  if (keywords.length === 0) return []

  const recommendations: { tag: any; score: number }[] = []

  for (const keyword of keywords) {
    const matchedTags = await prisma.tag.findMany({
      where: {
        isCanonical: true,
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } }
        ]
      },
      take: 5,
      select: {
        id: true,
        name: true,
        category: true,
        useCount: true
      }
    })

    for (const tag of matchedTags) {
      const exactMatch = tag.name.toLowerCase() === keyword.toLowerCase()
      const score = exactMatch ? 100 : (tag.name.toLowerCase().includes(keyword.toLowerCase()) ? 50 : 25) + (tag.useCount / 10)
      recommendations.push({ tag, score })
    }
  }

  const merged: Record<number, { tag: any; score: number }> = {}
  for (const rec of recommendations) {
    if (!merged[rec.tag.id]) {
      merged[rec.tag.id] = rec
    } else {
      merged[rec.tag.id].score += rec.score * 0.5
    }
  }

  return Object.values(merged)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.tag)
}

export async function recalculateAllTagUseCounts() {
  const tags = await prisma.tag.findMany()
  for (const tag of tags) {
    await updateTagUseCount(tag.id)
  }
}
