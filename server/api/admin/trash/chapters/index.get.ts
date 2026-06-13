import prisma from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const chapters = await prisma.chapter.findMany({
    where: {
      deletedAt: {
        not: null
      }
    },
    include: {
      novel: {
        select: {
          id: true,
          title: true,
          author: {
            select: {
              id: true,
              username: true
            }
          }
        }
      }
    },
    orderBy: {
      deletedAt: 'desc'
    }
  })

  const now = new Date()
  const chaptersWithExpiry = chapters.map((chapter) => {
    const deletedAt = new Date(chapter.deletedAt!)
    const expiresAt = new Date(deletedAt)
    expiresAt.setDate(expiresAt.getDate() + 30)
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      id: chapter.id,
      title: chapter.title,
      wordCount: chapter.wordCount,
      order: chapter.order,
      novelId: chapter.novelId,
      novel: chapter.novel,
      deletedAt: chapter.deletedAt,
      deletedBy: chapter.deletedBy,
      expiresAt,
      daysLeft: Math.max(0, daysLeft)
    }
  })

  return {
    chapters: chaptersWithExpiry
  }
})
