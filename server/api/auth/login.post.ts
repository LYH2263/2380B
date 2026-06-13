import bcrypt from 'bcryptjs'
import prisma from '~/server/utils/prisma'
import { loginSchema } from '~/server/utils/validators'
import { signToken } from '~/server/utils/auth'
import { checkAchievements } from '~/server/utils/achievementService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  const result = loginSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { email, password } = result.data

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: '邮箱或密码错误'
    })
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: '邮箱或密码错误'
    })
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role
  })

  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  })

  checkAchievements(user.id).catch(e => console.error('[login] 成就检测失败:', e))

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      points: user.points,
      totalPoints: user.totalPoints,
      level: user.level,
      inviteCode: user.inviteCode,
      nicknameColor: user.nicknameColor,
      avatarFrame: user.avatarFrame,
      adFree: user.adFree,
    },
    token
  }
})
