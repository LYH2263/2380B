import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  try {
    await prisma.chapterReadSession.update({
      where: { id: body.sessionId },
      data: {
        duration: body.duration,
        lastParagraph: body.lastParagraph,
        completionRate: body.completionRate
      }
    })
    
    return { success: true }
  } catch (e) {
    console.error('Heartbeat failed:', e)
    return { success: false }
  }
})
