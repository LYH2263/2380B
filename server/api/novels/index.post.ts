import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'
import { novelSchema } from '~/server/utils/validators'
import { awardCreateNovel } from '~/server/utils/pointsService'
import { updateNovelTags, getNovelTagNames } from '~/server/utils/tagService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const result = novelSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { title, description, cover, status, tags } = result.data

  const novel = await prisma.novel.create({
    data: {
      title,
      description,
      cover: cover || null,
      status: status || 'ONGOING',
      authorId: user.userId
    },
    include: {
      author: {
        select: { id: true, username: true, avatar: true }
      }
    }
  })

  if (tags && tags.length > 0) {
    await updateNovelTags(novel.id, tags)
  }

  const tagNames = await getNovelTagNames(novel.id)

  const pointsResult = await awardCreateNovel(user.userId, title)

  return {
    success: true,
    novel: {
      ...novel,
      tags: tagNames
    },
    pointsEarned: pointsResult.success ? 100 : 0,
    unlockedAchievements: pointsResult.unlockedAchievements || [],
  }
})
