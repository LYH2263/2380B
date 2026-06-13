import prisma from './prisma'
import type { PointSource } from '@prisma/client'
import { getLevelByPoints, calculateChapterPoints, POINT_RULES } from './levels'
import { checkAchievements } from './achievementService'

export async function addPoints(
  userId: number,
  points: number,
  source: PointSource,
  description?: string
): Promise<{ success: boolean; newPoints: number; newTotalPoints: number; newLevel: number; unlockedAchievements: any[] }> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, newPoints: 0, newTotalPoints: 0, newLevel: 1, unlockedAchievements: [] }
    }

    const newTotalPoints = user.totalPoints + points
    const newPoints = user.points + points
    const levelInfo = getLevelByPoints(newTotalPoints)
    const newLevel = levelInfo.level

    await prisma.$transaction(async (tx) => {
      await tx.pointRecord.create({
        data: {
          userId,
          points,
          source,
          description,
        }
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          points: newPoints,
          totalPoints: newTotalPoints,
          level: newLevel,
        }
      })
    })

    const unlockedAchievements = await checkAchievements(userId)

    return {
      success: true,
      newPoints,
      newTotalPoints,
      newLevel,
      unlockedAchievements,
    }
  } catch (error) {
    console.error('Error adding points:', error)
    return { success: false, newPoints: 0, newTotalPoints: 0, newLevel: 1, unlockedAchievements: [] }
  }
}

export async function deductPoints(
  userId: number,
  points: number,
  source: PointSource,
  description?: string
): Promise<{ success: boolean; newPoints: number; insufficient?: boolean }> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, newPoints: 0 }
    }

    if (user.points < points) {
      return { success: false, newPoints: user.points, insufficient: true }
    }

    const newPoints = user.points - points

    await prisma.$transaction(async (tx) => {
      await tx.pointRecord.create({
        data: {
          userId,
          points: -points,
          source,
          description,
        }
      })

      await tx.user.update({
        where: { id: userId },
        data: { points: newPoints }
      })
    })

    return { success: true, newPoints }
  } catch (error) {
    console.error('Error deducting points:', error)
    return { success: false, newPoints: 0 }
  }
}

export async function awardCreateNovel(userId: number, novelTitle: string) {
  return addPoints(userId, POINT_RULES.createNovel, 'CREATE_NOVEL', `发布小说《${novelTitle}》`)
}

export async function awardPublishChapter(userId: number, wordCount: number, chapterTitle: string) {
  const points = calculateChapterPoints(wordCount)
  return addPoints(userId, points, 'PUBLISH_CHAPTER', `发布章节《${chapterTitle}》(${wordCount}字)`)
}

export async function awardComment(userId: number, chapterTitle: string) {
  return addPoints(userId, POINT_RULES.comment, 'COMMENT', `评论章节《${chapterTitle}》`)
}

export async function awardRating(userId: number, novelTitle: string, score: number) {
  return addPoints(userId, POINT_RULES.rating, 'RATING', `为《${novelTitle}》评分${score}星`)
}

export async function awardInviteUser(inviterId: number, inviteeName: string) {
  return addPoints(inviterId, POINT_RULES.inviteUser, 'INVITE_USER', `邀请用户${inviteeName}注册`)
}

export async function awardNovelFavorited(authorId: number, novelTitle: string) {
  return addPoints(authorId, POINT_RULES.novelFavorited, 'NOVEL_FAVORITED', `作品《${novelTitle}》被收藏`)
}

export async function awardNovelLiked(authorId: number, novelTitle: string) {
  return addPoints(authorId, POINT_RULES.novelLiked, 'NOVEL_LIKED', `作品《${novelTitle}》被点赞`)
}
