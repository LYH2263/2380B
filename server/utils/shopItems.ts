import prisma from './prisma'
import type { ItemCategory } from '@prisma/client'

interface ShopItemDefinition {
  name: string
  description: string
  price: number
  category: ItemCategory
  image?: string
  effectValue?: string
  durationDays?: number
  stock?: number
}

export const SHOP_ITEMS: ShopItemDefinition[] = [
  {
    name: '青铜头像框',
    description: '精美的青铜边框，彰显你的身份',
    price: 200,
    category: 'AVATAR_FRAME',
    effectValue: 'bronze',
  },
  {
    name: '白银头像框',
    description: '闪耀的白银边框，更高级的视觉享受',
    price: 800,
    category: 'AVATAR_FRAME',
    effectValue: 'silver',
  },
  {
    name: '黄金头像框',
    description: '尊贵的黄金边框，作者级别的荣耀',
    price: 2500,
    category: 'AVATAR_FRAME',
    effectValue: 'gold',
  },
  {
    name: '钻石头像框',
    description: '璀璨的钻石边框，传说级别的象征',
    price: 8000,
    category: 'AVATAR_FRAME',
    effectValue: 'diamond',
  },
  {
    name: '彩虹头像框',
    description: '绚丽的彩虹边框，独一无二的视觉效果',
    price: 15000,
    category: 'AVATAR_FRAME',
    effectValue: 'rainbow',
  },
  {
    name: '蓝色昵称',
    description: '将你的昵称设置为清新的蓝色',
    price: 500,
    category: 'NICKNAME_COLOR',
    effectValue: '#3b82f6',
  },
  {
    name: '紫色昵称',
    description: '将你的昵称设置为神秘的紫色',
    price: 800,
    category: 'NICKNAME_COLOR',
    effectValue: '#8b5cf6',
  },
  {
    name: '粉色昵称',
    description: '将你的昵称设置为可爱的粉色',
    price: 1000,
    category: 'NICKNAME_COLOR',
    effectValue: '#ec4899',
  },
  {
    name: '金色昵称',
    description: '将你的昵称设置为高贵的金色',
    price: 2000,
    category: 'NICKNAME_COLOR',
    effectValue: '#f59e0b',
  },
  {
    name: '30天免广告',
    description: '30天内浏览平台将不再显示任何广告',
    price: 300,
    category: 'AD_FREE',
    effectValue: 'true',
    durationDays: 30,
  },
  {
    name: '90天免广告',
    description: '90天内浏览平台将不再显示任何广告，更划算',
    price: 800,
    category: 'AD_FREE',
    effectValue: 'true',
    durationDays: 90,
  },
  {
    name: '永久免广告',
    description: '永久免除平台所有广告，一次购买终身受益',
    price: 5000,
    category: 'AD_FREE',
    effectValue: 'true',
  },
  {
    name: '资深读者徽章',
    description: '专属身份标识，在评论区展示',
    price: 1500,
    category: 'BADGE',
    effectValue: 'senior_reader',
  },
  {
    name: '评论达人徽章',
    description: '评论区专属标识，你的评论更引人注目',
    price: 1200,
    category: 'BADGE',
    effectValue: 'comment_master',
  },
]

export async function initializeShopItems() {
  const existing = await prisma.shopItem.findMany({ select: { name: true } })
  const existingNames = new Set(existing.map(i => i.name))

  const toCreate = SHOP_ITEMS.filter(item => !existingNames.has(item.name))

  if (toCreate.length > 0) {
    await prisma.shopItem.createMany({
      data: toCreate.map(item => ({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image: item.image,
        effectValue: item.effectValue,
        durationDays: item.durationDays,
        stock: item.stock,
      })),
      skipDuplicates: true,
    })
  }

  return toCreate.length
}
