export interface LevelInfo {
  level: number
  minPoints: number
  maxPoints: number
  name: string
  privileges: string[]
}

export const LEVELS: LevelInfo[] = [
  { level: 1, minPoints: 0, maxPoints: 99, name: '萌新读者', privileges: ['基础阅读', '评论功能'] },
  { level: 2, minPoints: 100, maxPoints: 299, name: '初级读者', privileges: ['收藏书架(无限)', '自定义头像'] },
  { level: 3, minPoints: 300, maxPoints: 699, name: '书海常客', privileges: ['签到双倍', '评分功能'] },
  { level: 4, minPoints: 700, maxPoints: 1499, name: '资深读者', privileges: ['专属头像框(青铜)', '评论优先展示'] },
  { level: 5, minPoints: 1500, maxPoints: 2999, name: '博学之士', privileges: ['专属昵称颜色', '邀请好友奖励+50%'] },
  { level: 6, minPoints: 3000, maxPoints: 5999, name: '文学爱好者', privileges: ['专属头像框(白银)', '章节评论高亮'] },
  { level: 7, minPoints: 6000, maxPoints: 11999, name: '品鉴大师', privileges: ['广告半减免', '专属身份标识'] },
  { level: 8, minPoints: 12000, maxPoints: 23999, name: '文坛领袖', privileges: ['专属头像框(黄金)', '推荐投票权'] },
  { level: 9, minPoints: 24000, maxPoints: 49999, name: '传奇作者', privileges: ['免广告', '小说推荐加权'] },
  { level: 10, minPoints: 50000, maxPoints: Infinity, name: '神话级VIP', privileges: ['专属头像框(钻石)', '全站特权标识', '客服优先'] },
]

export function getLevelByPoints(totalPoints: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVELS[i].minPoints) {
      return LEVELS[i]
    }
  }
  return LEVELS[0]
}

export function getLevelProgress(totalPoints: number): { current: number; required: number; percent: number } {
  const level = getLevelByPoints(totalPoints)
  const nextLevel = LEVELS.find(l => l.level === level.level + 1)

  const current = totalPoints - level.minPoints
  const required = nextLevel
    ? nextLevel.minPoints - level.minPoints
    : 0

  const percent = required > 0
    ? Math.min(100, Math.round((current / required) * 100))
    : 100

  return { current, required, percent }
}

export const CHECKIN_REWARDS = [
  { day: 1, points: 5, label: '签到第1天' },
  { day: 2, points: 8, label: '签到第2天' },
  { day: 3, points: 10, label: '签到第3天' },
  { day: 4, points: 12, label: '签到第4天' },
  { day: 5, points: 15, label: '签到第5天' },
  { day: 6, points: 18, label: '签到第6天' },
  { day: 7, points: 30, label: '签到第7天(连续签到周奖励)' },
]

export const RETRO_CHECKIN_COST = 20

export function getCheckinReward(consecutiveDays: number): number {
  const dayIndex = ((consecutiveDays - 1) % 7)
  return CHECKIN_REWARDS[dayIndex].points
}

export const POINT_RULES = {
  createNovel: 100,
  chapterPer100Words: 1,
  chapterMinReward: 5,
  chapterMaxReward: 100,
  comment: 5,
  rating: 3,
  inviteUser: 50,
  novelFavorited: 2,
  novelLiked: 1,
}

export function calculateChapterPoints(wordCount: number): number {
  const points = Math.floor(wordCount / 100) * POINT_RULES.chapterPer100Words
  return Math.min(POINT_RULES.chapterMaxReward, Math.max(POINT_RULES.chapterMinReward, points))
}
