import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = getAuthUser(event)
  
  const ipAddress = getHeader(event, 'x-forwarded-for') || 
                    getHeader(event, 'x-real-ip') || 
                    event.node.req.socket.remoteAddress
  
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: body.type,
        userId: body.userId || user?.userId || null,
        deviceId: body.deviceId,
        novelId: body.novelId || null,
        chapterId: body.chapterId || null,
        path: body.path,
        referrer: body.referrer || null,
        userAgent: body.userAgent || null,
        ipAddress: ipAddress || null,
        properties: body.properties || null
      }
    })
    
    return { success: true }
  } catch (e) {
    console.error('Analytics tracking error:', e)
    return { success: false }
  }
})
