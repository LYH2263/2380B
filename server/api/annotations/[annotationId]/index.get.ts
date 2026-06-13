import prisma from '~/server/utils/prisma'
import { checkAnnotationPermissionByAnnotationId } from '~/server/utils/annotationPermission'

export default defineEventHandler(async (event) => {
  const annotationId = Number(event.context.params?.annotationId)

  if (!annotationId || isNaN(annotationId)) {
    throw createError({
      statusCode: 400,
      message: '无效的批注ID'
    })
  }

  await checkAnnotationPermissionByAnnotationId(event, annotationId)

  const annotation = await prisma.annotation.findUnique({
    where: { id: annotationId },
    include: {
      user: {
        select: { id: true, username: true, avatar: true }
      },
      replies: {
        include: {
          user: {
            select: { id: true, username: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!annotation) {
    throw createError({
      statusCode: 404,
      message: '批注不存在'
    })
  }

  return { annotation }
})
