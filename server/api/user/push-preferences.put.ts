import { requireAuth } from '~/server/utils/auth'
import { updatePushPreference } from '~/server/utils/notificationService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)

  const { pushFrequency, enableInApp, enableEmail, enableWebPush } = body

  const updateData: any = {}
  if (pushFrequency !== undefined) updateData.pushFrequency = pushFrequency
  if (enableInApp !== undefined) updateData.enableInApp = enableInApp
  if (enableEmail !== undefined) updateData.enableEmail = enableEmail
  if (enableWebPush !== undefined) updateData.enableWebPush = enableWebPush

  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      message: '没有提供有效的更新字段'
    })
  }

  const preferences = await updatePushPreference(user.userId, updateData)

  return {
    success: true,
    preferences
  }
})
