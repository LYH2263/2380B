import { requireAuth } from '~/server/utils/auth'
import prisma from '~/server/utils/prisma'
import { deductPoints } from '~/server/utils/pointsService'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)

  const body = await readBody(event)
  const { shopItemId } = body

  if (!shopItemId) {
    throw createError({ statusCode: 400, message: '请选择要兑换的物品' })
  }

  const item = await prisma.shopItem.findUnique({
    where: { id: parseInt(shopItemId) }
  })

  if (!item) {
    throw createError({ statusCode: 404, message: '物品不存在' })
  }

  if (!item.isActive) {
    throw createError({ statusCode: 400, message: '该物品已下架' })
  }

  if (item.stock !== null && item.stock !== undefined && item.stock <= 0) {
    throw createError({ statusCode: 400, message: '该物品已售罄' })
  }

  const deductResult = await deductPoints(
    authUser.userId,
    item.price,
    'REDEEM',
    `兑换${item.name}`
  )

  if (!deductResult.success) {
    if (deductResult.insufficient) {
      throw createError({ statusCode: 400, message: '积分不足' })
    }
    throw createError({ statusCode: 500, message: '兑换失败，请稍后重试' })
  }

  let expiresAt: Date | null = null
  if (item.durationDays) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + item.durationDays)
  }

  const userItem = await prisma.$transaction(async (tx) => {
    if (item.stock !== null && item.stock !== undefined) {
      await tx.shopItem.update({
        where: { id: item.id },
        data: {
          stock: { decrement: 1 },
          soldCount: { increment: 1 },
        }
      })
    } else {
      await tx.shopItem.update({
        where: { id: item.id },
        data: { soldCount: { increment: 1 } }
      })
    }

    const ui = await tx.userItem.create({
      data: {
        userId: authUser.userId,
        shopItemId: item.id,
        expiresAt,
      },
      include: { shopItem: true }
    })

    const now = new Date()
    const updateData: any = {}

    if (item.category === 'AVATAR_FRAME') {
      updateData.avatarFrame = item.effectValue
    } else if (item.category === 'NICKNAME_COLOR') {
      updateData.nicknameColor = item.effectValue
    } else if (item.category === 'AD_FREE') {
      if (item.durationDays) {
        await tx.user.update({
          where: { id: authUser.userId },
          data: { adFree: true }
        })
      } else {
        updateData.adFree = true
      }
    }

    if (Object.keys(updateData).length > 0) {
      await tx.user.update({
        where: { id: authUser.userId },
        data: updateData
      })
    }

    return ui
  })

  const updatedUser = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: {
      points: true,
      avatarFrame: true,
      nicknameColor: true,
      adFree: true,
    }
  })

  return {
    success: true,
    data: {
      item: userItem,
      shopItem: item,
      userPoints: updatedUser?.points || 0,
      updatedUser,
    }
  }
})
