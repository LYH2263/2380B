import prisma from './prisma'
import type { PushMethod, NotificationType, PushFrequency } from '@prisma/client'

const BATCH_SIZE = 100

export interface CreateNotificationOptions {
  userId: number
  novelId?: number
  chapterId?: number
  type?: NotificationType
  title: string
  content: string
  pushMethods: PushMethod[]
}

export interface TriggerNovelUpdateOptions {
  novelId: number
  chapterId: number
  chapterTitle: string
  novelTitle: string
}

export async function getOrCreatePushPreference(userId: number) {
  let preference = await prisma.pushPreference.findUnique({
    where: { userId }
  })

  if (!preference) {
    preference = await prisma.pushPreference.create({
      data: {
        userId,
        pushFrequency: 'REALTIME',
        enableInApp: true,
        enableEmail: false,
        enableWebPush: false
      }
    })
  }

  return preference
}

export async function createNotification(options: CreateNotificationOptions) {
  const { userId, novelId, chapterId, type = 'NOVEL_UPDATE', title, content, pushMethods } = options

  return await prisma.notification.create({
    data: {
      userId,
      novelId,
      chapterId,
      type,
      title,
      content,
      pushMethods,
      status: 'PENDING'
    }
  })
}

export async function triggerNovelUpdateNotifications(options: TriggerNovelUpdateOptions) {
  const { novelId, chapterId, chapterTitle, novelTitle } = options

  const totalSubscribers = await prisma.subscription.count({
    where: { novelId }
  })

  if (totalSubscribers === 0) {
    return { success: true, totalCreated: 0 }
  }

  const batch = await prisma.notificationBatch.create({
    data: {
      novelId,
      chapterId,
      totalCount: totalSubscribers,
      status: 'PROCESSING',
      startedAt: new Date()
    }
  })

  let processedCount = 0
  let failedCount = 0

  try {
    let cursor: number | undefined = undefined

    while (true) {
      const subscribers = await prisma.subscription.findMany({
        where: { novelId },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              pushPreferences: true,
              emailVerified: true
            }
          }
        },
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' }
      })

      if (subscribers.length === 0) break

      const notificationData = []

      for (const sub of subscribers) {
        const prefs = sub.user.pushPreferences || await getOrCreatePushPreference(sub.userId)

        const pushMethods: PushMethod[] = []

        if (prefs.enableInApp) {
          pushMethods.push('IN_APP')
        }

        if (prefs.enableEmail && sub.user.emailVerified) {
          pushMethods.push('EMAIL')
        }

        if (prefs.enableWebPush) {
          pushMethods.push('WEB_PUSH')
        }

        if (pushMethods.length > 0) {
          if (prefs.pushFrequency === 'REALTIME') {
            notificationData.push({
              userId: sub.userId,
              novelId,
              chapterId,
              type: 'NOVEL_UPDATE' as const,
              title: `《${novelTitle}》更新了`,
              content: `新章节「${chapterTitle}」已发布，快来阅读吧！`,
              pushMethods,
              status: 'PENDING' as const
            })
          } else {
            notificationData.push({
              userId: sub.userId,
              novelId,
              chapterId,
              type: 'NOVEL_UPDATE' as const,
              title: `《${novelTitle}》更新了`,
              content: `新章节「${chapterTitle}」已发布，快来阅读吧！`,
              pushMethods,
              status: 'PENDING' as const
            })
          }
        }
      }

      if (notificationData.length > 0) {
        try {
          await prisma.notification.createMany({
            data: notificationData,
            skipDuplicates: true
          })
          processedCount += notificationData.length
        } catch (e) {
          failedCount += subscribers.length
        }
      }

      cursor = subscribers[subscribers.length - 1].id

      if (subscribers.length < BATCH_SIZE) break
    }

    await prisma.notificationBatch.update({
      where: { id: batch.id },
      data: {
        processedCount,
        failedCount,
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    return {
      success: true,
      batchId: batch.id,
      totalCreated: processedCount,
      failedCount,
      totalSubscribers
    }
  } catch (error) {
    await prisma.notificationBatch.update({
      where: { id: batch.id },
      data: {
        processedCount,
        failedCount: totalSubscribers - processedCount,
        status: 'FAILED',
        completedAt: new Date()
      }
    })
    throw error
  }
}

export async function getUserNotifications(userId: number, page: number = 1, limit: number = 20) {
  const totalCount = await prisma.notification.count({
    where: { userId }
  })

  const notifications = await prisma.notification.findMany({
    where: { userId },
    include: {
      novel: {
        select: {
          id: true,
          title: true,
          cover: true
        }
      },
      chapter: {
        select: {
          id: true,
          title: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  })

  return {
    notifications,
    totalCount,
    hasMore: page * limit < totalCount,
    currentPage: page,
    limit
  }
}

export async function getUnreadNotificationCount(userId: number) {
  const count = await prisma.notification.count({
    where: {
      userId,
      read: false
    }
  })
  return { unreadCount: count }
}

export async function markNotificationAsRead(notificationId: number, userId: number) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true }
  })

  if (!notification) {
    throw new Error('通知不存在')
  }

  if (notification.userId !== userId) {
    throw new Error('无权操作该通知')
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: {
      read: true,
      readAt: new Date(),
      status: 'READ'
    }
  })
}

export async function markAllNotificationsAsRead(userId: number) {
  return await prisma.notification.updateMany({
    where: {
      userId,
      read: false
    },
    data: {
      read: true,
      readAt: new Date(),
      status: 'READ'
    }
  })
}

export async function getUnreadUpdatesSummary(userId: number) {
  const unreadNotifications = await prisma.notification.findMany({
    where: {
      userId,
      read: false,
      type: 'NOVEL_UPDATE',
      novelId: { not: null }
    },
    include: {
      novel: {
        select: {
          id: true,
          title: true,
          cover: true,
          status: true,
          _count: {
            select: { chapters: true }
          }
        }
      },
      chapter: {
        select: {
          id: true,
          title: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const novelGroups = new Map<number, {
    novel: any
    updates: any[]
    unreadCount: number
    latestUpdate: Date
  }>()

  for (const notification of unreadNotifications) {
    if (!notification.novelId) continue

    const novelId = notification.novelId
    if (!novelGroups.has(novelId)) {
      novelGroups.set(novelId, {
        novel: notification.novel,
        updates: [],
        unreadCount: 0,
        latestUpdate: notification.createdAt
      })
    }

    const group = novelGroups.get(novelId)!
    group.updates.push({
      notificationId: notification.id,
      chapter: notification.chapter,
      createdAt: notification.createdAt
    })
    group.unreadCount++
    if (notification.createdAt > group.latestUpdate) {
      group.latestUpdate = notification.createdAt
    }
  }

  const result = Array.from(novelGroups.values()).sort((a, b) =>
    b.latestUpdate.getTime() - a.latestUpdate.getTime()
  )

  return {
    novels: result,
    totalUnread: unreadNotifications.length,
    totalNovels: novelGroups.size
  }
}

export async function processPendingNotifications() {
  const pending = await prisma.notification.findMany({
    where: {
      status: 'PENDING'
    },
    take: 50
  })

  for (const notification of pending) {
    try {
      if (notification.pushMethods.includes('EMAIL')) {
        console.log(`[Email] Sending update notification to user ${notification.userId}: ${notification.title}`)
      }

      if (notification.pushMethods.includes('WEB_PUSH')) {
        console.log(`[WebPush] Sending push notification to user ${notification.userId}: ${notification.title}`)
      }

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      })
    } catch (error) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' }
      })
    }
  }
}

export async function updatePushPreference(userId: number, data: {
  pushFrequency?: PushFrequency
  enableInApp?: boolean
  enableEmail?: boolean
  enableWebPush?: boolean
}) {
  await getOrCreatePushPreference(userId)

  return await prisma.pushPreference.update({
    where: { userId },
    data
  })
}
