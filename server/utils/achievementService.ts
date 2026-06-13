import prisma from './prisma'
import { ACHIEVEMENT_DEFINITIONS, type AchievementDefinition } from './achievements'
import { addPoints } from './pointsService'

interface UserMetrics {
  loginCount: number
  novelCount: number
  chapterCount: number
  consecutiveUpdateDays: number
  commentCount: number
  ratingCount: number
  favoriteCount: number
  readChapterCount: number
  checkinCount: number
  consecutiveCheckinDays: number
  inviteCount: number
  novelMaxFavorites: number
  level: number
  totalPoints: number
}

async function collectUserMetrics(userId: number): Promise<UserMetrics> {
  const [
    user,
    novels,
    chapters,
    comments,
    ratings,
    favorites,
    checkIns,
    invitations,
    readHistory,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.novel.findMany({ where: { authorId: userId }, include: { _count: { select: { favorites: true, chapters: true } } } }),
    prisma.chapter.findMany({
      where: { novel: { authorId: userId } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.comment.count({ where: { userId } }),
    prisma.rating.count({ where: { userId } }),
    prisma.favorite.count({ where: { userId } }),
    prisma.checkIn.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 200 }),
    prisma.invitation.count({ where: { inviterId: userId, rewardGiven: true } }),
    prisma.readHistory.count({ where: { userId } }),
  ])

  const novelCount = novels.length
  const chapterCount = novels.reduce((sum, n) => sum + (n._count.chapters || 0), 0)
  const novelMaxFavorites = Math.max(0, ...novels.map(n => n._count.favorites || 0))

  const consecutiveUpdateDays = calculateConsecutiveDays(
    chapters.map(c => normalizeDate(c.createdAt))
  )
  const consecutiveCheckinDays = calculateConsecutiveDays(
    checkIns.map(c => normalizeDate(c.date))
  )

  return {
    loginCount: 1,
    novelCount,
    chapterCount,
    consecutiveUpdateDays,
    commentCount: comments,
    ratingCount: ratings,
    favoriteCount: favorites,
    readChapterCount: readHistory,
    checkinCount: checkIns.length,
    consecutiveCheckinDays,
    inviteCount: invitations,
    novelMaxFavorites,
    level: user?.level || 1,
    totalPoints: user?.totalPoints || 0,
  }
}

function normalizeDate(date: Date): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calculateConsecutiveDays(dateStrings: string[]): number {
  if (dateStrings.length === 0) return 0

  const uniqueDates = Array.from(new Set(dateStrings)).sort().reverse()
  if (uniqueDates.length === 0) return 0

  let consecutive = 0
  const today = normalizeDate(new Date())
  let currentDate = new Date(today)

  for (let i = 0; i < 365; i++) {
    const dateStr = normalizeDate(currentDate)
    if (uniqueDates.includes(dateStr)) {
      consecutive++
      currentDate.setDate(currentDate.getDate() - 1)
    } else if (i === 0) {
      currentDate.setDate(currentDate.getDate() - 1)
      continue
    } else {
      break
    }
  }

  return consecutive
}

export async function checkAchievements(userId: number): Promise<AchievementDefinition[]> {
  const unlockedCodes = (await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievement: { select: { code: true } } },
  })).map(ua => ua.achievement.code)

  const metrics = await collectUserMetrics(userId)
  const newlyUnlocked: AchievementDefinition[] = []

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedCodes.includes(def.code)) continue

    const { criteria } = def
    let achieved = false

    const metricValue: number = (metrics as any)[criteria.metric] ?? (metrics as any)[
      criteria.metric
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
    ] ?? 0
    const t = criteria.type

    if (t === 'count' || t === 'threshold' || t === 'consecutive' || t === 'milestone' || t === 'gte' || t === 'min') {
      achieved = (metricValue || 0) >= criteria.target
    } else if (t === 'lte' || t === 'max') {
      achieved = (metricValue || 0) <= criteria.target
    } else if (t === 'eq' || t === 'equals') {
      achieved = (metricValue || 0) === criteria.target
    }

    if (achieved) {
      newlyUnlocked.push(def)
    }
  }

  if (newlyUnlocked.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const def of newlyUnlocked) {
        let achievement = await tx.achievement.findUnique({ where: { code: def.code } })
        if (!achievement) {
          achievement = await tx.achievement.create({
            data: {
              code: def.code,
              name: def.name,
              description: def.description,
              icon: def.icon,
              points: def.points,
              category: def.category,
              criteria: JSON.stringify(def.criteria),
            }
          })
        }

        await tx.userAchievement.upsert({
          where: {
            userId_achievementId: { userId, achievementId: achievement.id }
          },
          update: {},
          create: { userId, achievementId: achievement.id },
        })

        if (def.points > 0) {
          const user = await tx.user.findUnique({ where: { id: userId } })
          if (user) {
            await tx.pointRecord.create({
              data: {
                userId,
                points: def.points,
                source: 'SYSTEM',
                description: `达成成就「${def.name}」`,
              }
            })
            await tx.user.update({
              where: { id: userId },
              data: {
                points: { increment: def.points },
                totalPoints: { increment: def.points },
              }
            })
          }
        }
      }
    })
  }

  return newlyUnlocked
}

export async function initializeAchievements() {
  const existing = await prisma.achievement.findMany({ select: { code: true } })
  const existingCodes = new Set(existing.map(a => a.code))

  const toCreate = ACHIEVEMENT_DEFINITIONS.filter(def => !existingCodes.has(def.code))

  if (toCreate.length > 0) {
    await prisma.achievement.createMany({
      data: toCreate.map(def => ({
        code: def.code,
        name: def.name,
        description: def.description,
        icon: def.icon,
        points: def.points,
        category: def.category,
        criteria: JSON.stringify(def.criteria),
      })),
      skipDuplicates: true,
    })
  }

  return toCreate.length
}
