import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const applications = await prisma.authorApplication.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      reviewer: {
        select: { id: true, username: true }
      }
    }
  })

  return { applications }
})
