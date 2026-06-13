import prisma from '~/server/utils/prisma'
import { checkAnnotationPermissionByAnnotationId } from '~/server/utils/annotationPermission'
import { annotationReplySchema } from '~/server/utils/validators'

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

  const result = annotationReplySchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { content } = result.data

  const reply = await prisma.annotationReply.create({
    data: {
      annotationId,
      userId: user.userId,
      content
    },
    include: {
      user: {
        select: { id: true, username: true, avatar: true }
      }
    }
  })

  return {
    success: true,
    reply
  }
})
