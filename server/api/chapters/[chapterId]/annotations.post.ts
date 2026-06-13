import prisma from '~/server/utils/prisma'
import { checkAnnotationPermission } from '~/server/utils/annotationPermission'
import { annotationSchema } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const chapterId = Number(event.context.params?.chapterId)
  const body = await readBody(event)

  if (!chapterId || isNaN(chapterId)) {
    throw createError({
      statusCode: 400,
      message: '无效的章节ID'
    })
  }

  const user = await checkAnnotationPermission(event, chapterId)

  const result = annotationSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { content, startOffset, endOffset, anchorText } = result.data

  if (startOffset >= endOffset) {
    throw createError({
      statusCode: 400,
      message: '文本范围无效'
    })
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { content: true }
  })

  if (!chapter) {
    throw createError({
      statusCode: 404,
      message: '章节不存在'
    })
  }

  if (endOffset > chapter.content.length) {
    throw createError({
      statusCode: 400,
      message: '文本范围超出章节内容长度'
    })
  }

  const annotation = await prisma.annotation.create({
    data: {
      chapterId,
      userId: user.userId,
      startOffset,
      endOffset,
      anchorText,
      content,
      status: 'PENDING'
    },
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
