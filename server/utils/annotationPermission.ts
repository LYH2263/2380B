import prisma from '~/server/utils/prisma'
import type { H3Event } from 'h3'
import { requireAuth } from '~/server/utils/auth'

export interface AnnotationAuthUser {
  userId: number
  role: 'USER' | 'ADMIN'
  email: string
}

export async function checkAnnotationPermission(
  event: H3Event,
  chapterId: number
): Promise<AnnotationAuthUser> {
  const user = requireAuth(event)

  if (user.role === 'ADMIN') {
    return user
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      novel: {
        select: { authorId: true }
      }
    }
  })

  if (!chapter) {
    throw createError({
      statusCode: 404,
      message: '章节不存在'
    })
  }

  if (chapter.novel.authorId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: '仅章节作者和管理员可查看和参与批注'
    })
  }

  return user
}

export async function checkAnnotationPermissionByAnnotationId(
  event: H3Event,
  annotationId: number
): Promise<{ user: AnnotationAuthUser; chapterId: number }> {
  const annotation = await prisma.annotation.findUnique({
    where: { id: annotationId },
    select: { chapterId: true }
  })

  if (!annotation) {
    throw createError({
      statusCode: 404,
      message: '批注不存在'
    })
  }

  const user = await checkAnnotationPermission(event, annotation.chapterId)
  return { user, chapterId: annotation.chapterId }
}
