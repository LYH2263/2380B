import prisma from '~/server/utils/prisma'
import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = getAuthUser(event)
  
  try {
    const session = await prisma.chapterReadSession.create({
      data: {
        userId: body.userId || user?.userId || null,
        deviceId: body.deviceId,
        novelId: body.novelId,
        chapterId: body.chapterId,
        totalParagraphs: body.totalParagraphs,
        startTime: new Date()
      }
    })
    
    return { sessionId: session.id }
  } catch (e) {
    console.error('Failed to start reading session:', e)
    throw createError({
      statusCode: 500,
      message: 'Failed to start reading session'
    })
  }
})
