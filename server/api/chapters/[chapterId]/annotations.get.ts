import prisma from '~/server/utils/prisma'
import { checkAnnotationPermission } from '~/server/utils/annotationPermission'

export default defineEventHandler(async (event) => {
  const chapterId = Number(event.context.params?.chapterId)
  const query = getQuery(event)
  const statusFilter = query.status as 'PENDING' | 'RESOLVED' | undefined

  if (!chapterId || isNaN(chapterId)) {
    throw createError({
      statusCode: 400,
      message: '无效的章节ID'
    })
  }

  const user = await checkAnnotationPermission(event, chapterId)

  const where: any = { chapterId }

  if (statusFilter === 'PENDING' || statusFilter === 'RESOLVED') {
    where.status = statusFilter
  }

  const annotations = await prisma.annotation.findMany({
    where,
    include: {
      user: {
        select: { id: true, username: true, avatar: true }
      },
      _count: {
        select: { replies: true }
      }
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' }
    ]
  })

  return {
    annotations,
    canResolve: true
  }
})
