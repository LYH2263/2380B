import prisma from '~/server/utils/prisma'
import { requirePermission } from '~/server/utils/permissionMiddleware'
import { ROLE_LABELS } from '~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const adminUser = await requirePermission(event, 'admin:permissions')
  const body = await readBody(event)

  const { applicationId, action, reviewNote } = body

  if (!applicationId || !action || !['APPROVED', 'REJECTED'].includes(action)) {
    throw createError({
      statusCode: 400,
      message: '参数无效'
    })
  }

  const application = await prisma.authorApplication.findUnique({
    where: { id: applicationId },
    include: { user: true }
  })

  if (!application) {
    throw createError({
      statusCode: 404,
      message: '申请不存在'
    })
  }

  if (application.status !== 'PENDING') {
    throw createError({
      statusCode: 400,
      message: '该申请已被处理'
    })
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.authorApplication.update({
      where: { id: applicationId },
      data: {
        status: action,
        reviewedBy: adminUser.userId,
        reviewNote: reviewNote || null,
        reviewedAt: new Date()
      }
    })

    if (action === 'APPROVED') {
      const oldRole = application.user.role
      await tx.user.update({
        where: { id: application.userId },
        data: { role: 'AUTHOR' }
      })

      await tx.roleChangeLog.create({
        data: {
          userId: application.userId,
          oldRole: oldRole,
          newRole: 'AUTHOR',
          changedBy: adminUser.userId,
          reason: `作者认证申请通过 (申请ID: ${applicationId})`
        }
      })
    }

    return updated
  })

  return {
    success: true,
    application: result
  }
})
