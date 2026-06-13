import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const { reason } = body
  if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
    throw createError({
      statusCode: 400,
      message: '申请理由至少需要10个字符'
    })
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true }
  })

  if (existingUser?.role === 'AUTHOR' || existingUser?.role === 'ADMIN') {
    throw createError({
      statusCode: 400,
      message: '您已经是认证作者或管理员'
    })
  }

  const pendingApplication = await prisma.authorApplication.findFirst({
    where: {
      userId: user.userId,
      status: 'PENDING'
    }
  })

  if (pendingApplication) {
    throw createError({
      statusCode: 400,
      message: '您已有一份待审核的申请'
    })
  }

  const application = await prisma.authorApplication.create({
    data: {
      userId: user.userId,
      reason: reason.trim()
    }
  })

  return {
    success: true,
    application
  }
})
