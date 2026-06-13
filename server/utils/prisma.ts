import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  })
}

declare global {
  var __prisma__: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.__prisma__ ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma__ = prisma
}

export default prisma
