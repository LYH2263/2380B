import { requireAuth } from '~/server/utils/auth'
import { getOrCreatePushPreference } from '~/server/utils/notificationService'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const preferences = await getOrCreatePushPreference(user.userId)
  return { preferences }
})
