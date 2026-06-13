import bcrypt from 'bcryptjs'
import { prisma } from '~/server/utils/prisma'
import { registerSchema } from '~/server/utils/validators'
import { signToken } from '~/server/utils/auth'
import { awardInviteUser, addPoints } from '~/server/utils/pointsService'
import { checkAchievements } from '~/server/utils/achievementService'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function generateUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode()
  let attempt = 0
  while (attempt < 100) {
    const existing = await prisma.user.findUnique({ where: { inviteCode: code } })
    if (!existing) return code
    code = generateInviteCode()
    attempt++
  }
  return code + Date.now().toString().slice(-4)
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = registerSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message
    })
  }

  const { email, username, password, inviteCode } = result.data as any

  const existingEmail = await prisma.user.findUnique({
    where: { email }
  })
  if (existingEmail) {
    throw createError({
      statusCode: 400,
      message: '该邮箱已被注册'
    })
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username }
  })
  if (existingUsername) {
    throw createError({
      statusCode: 400,
      message: '该用户名已被使用'
    })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const uniqueInviteCode = await generateUniqueInviteCode()

  let inviterId: number | null = null
  if (inviteCode) {
    const inviter = await prisma.user.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() }
    })
    if (inviter) {
      inviterId = inviter.id
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        inviteCode: uniqueInviteCode,
      }
    })

    if (inviterId) {
      await tx.invitation.create({
        data: {
          inviterId,
          inviteeId: newUser.id,
        }
      })
    }

    return newUser
  })

  if (inviterId) {
    await prisma.invitation.update({
      where: { inviteeId: user.id },
      data: { rewardGiven: true }
    })
    await awardInviteUser(inviterId, username)
  }

  setTimeout(async () => {
    await checkAchievements(user.id)
    if (inviterId) {
      await checkAchievements(inviterId)
    }
  }, 100)

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

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      points: 0,
      totalPoints: 0,
      level: 1,
      inviteCode: user.inviteCode,
      invitedBy: inviterId ? true : false,
    },
    token
  }
})
