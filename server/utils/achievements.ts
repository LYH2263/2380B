import type { AchievementCategory } from '@prisma/client'

export interface AchievementDefinition {
  code: string
  name: string
  description: string
  icon: string
  points: number
  category: AchievementCategory
  criteria: AchievementCriteria
}

export interface AchievementCriteria {
  type: 'count' | 'consecutive' | 'threshold' | 'milestone'
  metric: string
  target: number
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    code: 'FIRST_LOGIN',
    name: '初来乍到',
    description: '首次登录平台',
    icon: '🎯',
    points: 10,
    category: 'GENERAL',
    criteria: { type: 'count', metric: 'loginCount', target: 1 }
  },
  {
    code: 'NOVEL_100_FAVORITES',
    name: '小有名气',
    description: '作品获得100个收藏',
    icon: '💖',
    points: 50,
    category: 'CREATION',
    criteria: { type: 'threshold', metric: 'novelMaxFavorites', target: 100 }
  },
  {
    code: 'NOVEL_1000_FAVORITES',
    name: '万人迷',
    description: '作品获得1000个收藏',
    icon: '👑',
    points: 200,
    category: 'CREATION',
    criteria: { type: 'threshold', metric: 'novelMaxFavorites', target: 1000 }
  },
  {
    code: 'FIRST_NOVEL',
    name: '笔耕初试',
    description: '发布第一部小说',
    icon: '✍️',
    points: 20,
    category: 'CREATION',
    criteria: { type: 'count', metric: 'novelCount', target: 1 }
  },
  {
    code: 'NOVEL_5',
    name: '多产作家',
    description: '发布5部小说',
    icon: '📚',
    points: 100,
    category: 'CREATION',
    criteria: { type: 'count', metric: 'novelCount', target: 5 }
  },
  {
    code: 'CHAPTER_10',
    name: '持之以恒',
    description: '发布10个章节',
    icon: '📖',
    points: 30,
    category: 'CREATION',
    criteria: { type: 'count', metric: 'chapterCount', target: 10 }
  },
  {
    code: 'CHAPTER_100',
    name: '著作等身',
    description: '发布100个章节',
    icon: '📕',
    points: 150,
    category: 'CREATION',
    criteria: { type: 'count', metric: 'chapterCount', target: 100 }
  },
  {
    code: 'CONSECUTIVE_UPDATE_7',
    name: '笔耕不辍',
    description: '连续7天更新章节',
    icon: '🔥',
    points: 80,
    category: 'CREATION',
    criteria: { type: 'consecutive', metric: 'consecutiveUpdateDays', target: 7 }
  },
  {
    code: 'CONSECUTIVE_UPDATE_30',
    name: '日日精进',
    description: '连续30天更新章节',
    icon: '💎',
    points: 300,
    category: 'CREATION',
    criteria: { type: 'consecutive', metric: 'consecutiveUpdateDays', target: 30 }
  },
  {
    code: 'FIRST_COMMENT',
    name: '畅所欲言',
    description: '发布第一条评论',
    icon: '💬',
    points: 5,
    category: 'SOCIAL',
    criteria: { type: 'count', metric: 'commentCount', target: 1 }
  },
  {
    code: 'COMMENT_100',
    name: '评论家',
    description: '发布100条评论',
    icon: '🗣️',
    points: 60,
    category: 'SOCIAL',
    criteria: { type: 'count', metric: 'commentCount', target: 100 }
  },
  {
    code: 'RATING_10',
    name: '鉴赏家',
    description: '为10部作品评分',
    icon: '⭐',
    points: 20,
    category: 'SOCIAL',
    criteria: { type: 'count', metric: 'ratingCount', target: 10 }
  },
  {
    code: 'FAVORITE_10',
    name: '藏书家',
    description: '收藏10部作品',
    icon: '📋',
    points: 15,
    category: 'READING',
    criteria: { type: 'count', metric: 'favoriteCount', target: 10 }
  },
  {
    code: 'READ_CHAPTER_50',
    name: '手不释卷',
    description: '阅读50个章节',
    icon: '📗',
    points: 40,
    category: 'READING',
    criteria: { type: 'count', metric: 'readChapterCount', target: 50 }
  },
  {
    code: 'CHECKIN_30',
    name: '坚持不懈',
    description: '累计签到30天',
    icon: '📅',
    points: 50,
    category: 'GENERAL',
    criteria: { type: 'count', metric: 'checkinCount', target: 30 }
  },
  {
    code: 'CHECKIN_100',
    name: '忠实粉丝',
    description: '累计签到100天',
    icon: '🏆',
    points: 200,
    category: 'GENERAL',
    criteria: { type: 'count', metric: 'checkinCount', target: 100 }
  },
  {
    code: 'CONSECUTIVE_CHECKIN_30',
    name: '铁签到人',
    description: '连续签到30天',
    icon: '🎖️',
    points: 150,
    category: 'GENERAL',
    criteria: { type: 'consecutive', metric: 'consecutiveCheckinDays', target: 30 }
  },
  {
    code: 'INVITE_5',
    name: '友谊使者',
    description: '邀请5位新用户注册',
    icon: '🤝',
    points: 80,
    category: 'SOCIAL',
    criteria: { type: 'count', metric: 'inviteCount', target: 5 }
  },
  {
    code: 'LEVEL_5',
    name: '小有成就',
    description: '用户等级达到5级',
    icon: '🌟',
    points: 100,
    category: 'SPECIAL',
    criteria: { type: 'threshold', metric: 'level', target: 5 }
  },
  {
    code: 'LEVEL_10',
    name: '神话传说',
    description: '用户等级达到满级',
    icon: '🌈',
    points: 500,
    category: 'SPECIAL',
    criteria: { type: 'threshold', metric: 'level', target: 10 }
  },
]

export function getAchievementByCode(code: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find(a => a.code === code)
}
