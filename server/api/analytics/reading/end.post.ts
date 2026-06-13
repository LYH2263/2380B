import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  try {
    await prisma.chapterReadSession.update({
      where: { id: body.sessionId },
      data: {
        endTime: new Date(),
        duration: body.duration,
        lastParagraph: body.lastParagraph,
        completionRate: body.completionRate,
        exitPoint: body.exitPoint,
        isCompleted: body.isCompleted
      }
    })
    
    return { success: true }
  } catch (e) {
    console.error('Failed to end reading session:', e)
    return { success: false }
  }
})
