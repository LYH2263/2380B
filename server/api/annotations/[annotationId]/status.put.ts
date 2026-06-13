import prisma from '~/server/utils/prisma'
import { checkAnnotationPermissionByAnnotationId } from '~/server/utils/annotationPermission'
import { annotationStatusSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const annotationId = Number(event.context.params?.annotationId)
  const body = await readBody(event)

  if (!annotationId || isNaN(annotationId)) {
    throw createError({
      statusCode: 400,
      message: '无效的批注ID'
    })
  }

  const { user } = await checkAnnotationPermissionByAnnotationId(event, annotationId)

  const result = annotationStatusSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { status } = result.data

  const updateData: any = { status }

  if (status === 'RESOLVED') {
    updateData.resolvedAt = new Date()
    updateData.resolvedBy = user.userId
  } else {
    updateData.resolvedAt = null
    updateData.resolvedBy = null
  }

  const annotation = await prisma.annotation.update({
    where: { id: annotationId },
    data: updateData,
    include: {
      user: {
        select: { id: true, username: true, avatar: true }
      },
      _count: {
        select: { replies: true }
      }
    }
  })

  return {
    success: true,
    annotation
  }
})
