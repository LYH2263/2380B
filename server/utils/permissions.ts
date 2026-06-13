import type { Role } from '@prisma/client'

export type PermissionCode =
  | 'novel:publish'
  | 'novel:edit_own'
  | 'novel:edit_any'
  | 'novel:delete_own'
  | 'novel:delete_any'
  | 'chapter:publish'
  | 'chapter:edit_own'
  | 'chapter:edit_any'
  | 'chapter:delete_own'
  | 'chapter:delete_any'
  | 'comment:post'
  | 'comment:delete_own'
  | 'comment:delete_any'
  | 'annotation:create'
  | 'annotation:view'
  | 'annotation:resolve'
  | 'user:view_profile'
  | 'user:manage'
  | 'user:manage_role'
  | 'admin:dashboard'
  | 'admin:analytics'
  | 'admin:users'
  | 'admin:novels'
  | 'admin:permissions'
  | 'moderation:comments'
  | 'moderation:users'
  | 'moderation:reports'
  | 'vip:ad_free'
  | 'vip:exclusive_badge'
  | 'vip:priority_updates'
  | 'vip:early_access'
  | 'search:rebuild'
  | 'shop:redeem'
  | 'message:send'
  | 'notification:manage'

export interface PermissionDefinition {
  code: PermissionCode
  name: string
  description: string
  category: string
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { code: 'novel:publish', name: '发布小说', description: '创建并发布新小说', category: '创作' },
  { code: 'novel:edit_own', name: '编辑自己的小说', description: '编辑自己创作的小说', category: '创作' },
  { code: 'novel:edit_any', name: '编辑任意小说', description: '编辑任意用户的小说', category: '创作' },
  { code: 'novel:delete_own', name: '删除自己的小说', description: '删除自己创作的小说', category: '创作' },
  { code: 'novel:delete_any', name: '删除任意小说', description: '删除任意用户的小说', category: '创作' },
  { code: 'chapter:publish', name: '发布章节', description: '创建并发布新章节', category: '创作' },
  { code: 'chapter:edit_own', name: '编辑自己的章节', description: '编辑自己小说的章节', category: '创作' },
  { code: 'chapter:edit_any', name: '编辑任意章节', description: '编辑任意小说的章节', category: '创作' },
  { code: 'chapter:delete_own', name: '删除自己的章节', description: '删除自己小说的章节', category: '创作' },
  { code: 'chapter:delete_any', name: '删除任意章节', description: '删除任意小说的章节', category: '创作' },
  { code: 'comment:post', name: '发表评论', description: '在章节下发表评论', category: '互动' },
  { code: 'comment:delete_own', name: '删除自己的评论', description: '删除自己发表的评论', category: '互动' },
  { code: 'comment:delete_any', name: '删除任意评论', description: '删除任意用户的评论', category: '互动' },
  { code: 'annotation:create', name: '创建批注', description: '在章节中创建批注', category: '互动' },
  { code: 'annotation:view', name: '查看批注', description: '查看章节中的批注', category: '互动' },
  { code: 'annotation:resolve', name: '解决批注', description: '标记批注为已解决', category: '互动' },
  { code: 'user:view_profile', name: '查看用户资料', description: '查看用户公开资料', category: '用户' },
  { code: 'user:manage', name: '管理用户', description: '管理用户账户信息', category: '用户' },
  { code: 'user:manage_role', name: '管理用户角色', description: '调整用户角色和权限', category: '用户' },
  { code: 'admin:dashboard', name: '管理后台', description: '访问管理后台仪表盘', category: '管理' },
  { code: 'admin:analytics', name: '数据分析', description: '查看平台数据分析', category: '管理' },
  { code: 'admin:users', name: '用户管理', description: '管理后台用户管理页面', category: '管理' },
  { code: 'admin:novels', name: '小说管理', description: '管理后台小说管理页面', category: '管理' },
  { code: 'admin:permissions', name: '权限管理', description: '管理角色权限配置', category: '管理' },
  { code: 'moderation:comments', name: '评论审核', description: '审核和管理平台评论', category: '版务' },
  { code: 'moderation:users', name: '用户巡查', description: '巡查和处理用户违规行为', category: '版务' },
  { code: 'moderation:reports', name: '举报处理', description: '处理用户举报', category: '版务' },
  { code: 'vip:ad_free', name: '无广告', description: 'VIP用户免广告', category: 'VIP' },
  { code: 'vip:exclusive_badge', name: '专属标识', description: 'VIP专属身份标识', category: 'VIP' },
  { code: 'vip:priority_updates', name: '优先更新通知', description: 'VIP用户优先接收更新通知', category: 'VIP' },
  { code: 'vip:early_access', name: '抢先阅读', description: 'VIP用户可抢先阅读新章节', category: 'VIP' },
  { code: 'search:rebuild', name: '重建搜索索引', description: '重建搜索索引', category: '系统' },
  { code: 'shop:redeem', name: '积分兑换', description: '在积分商城兑换物品', category: '互动' },
  { code: 'message:send', name: '发送私信', description: '发送私信消息', category: '互动' },
  { code: 'notification:manage', name: '管理通知', description: '管理系统通知', category: '系统' },
]

const ROLE_PERMISSIONS: Record<Role, PermissionCode[]> = {
  USER: [
    'novel:publish',
    'novel:edit_own',
    'novel:delete_own',
    'chapter:publish',
    'chapter:edit_own',
    'chapter:delete_own',
    'comment:post',
    'comment:delete_own',
    'user:view_profile',
    'shop:redeem',
    'message:send',
    'notification:manage',
  ],
  AUTHOR: [
    'novel:publish',
    'novel:edit_own',
    'novel:delete_own',
    'chapter:publish',
    'chapter:edit_own',
    'chapter:delete_own',
    'comment:post',
    'comment:delete_own',
    'annotation:create',
    'annotation:view',
    'annotation:resolve',
    'user:view_profile',
    'shop:redeem',
    'message:send',
    'notification:manage',
  ],
  VIP: [
    'novel:publish',
    'novel:edit_own',
    'novel:delete_own',
    'chapter:publish',
    'chapter:edit_own',
    'chapter:delete_own',
    'comment:post',
    'comment:delete_own',
    'user:view_profile',
    'vip:ad_free',
    'vip:exclusive_badge',
    'vip:priority_updates',
    'vip:early_access',
    'shop:redeem',
    'message:send',
    'notification:manage',
  ],
  MODERATOR: [
    'novel:publish',
    'novel:edit_own',
    'novel:delete_own',
    'chapter:publish',
    'chapter:edit_own',
    'chapter:delete_own',
    'comment:post',
    'comment:delete_own',
    'comment:delete_any',
    'annotation:create',
    'annotation:view',
    'annotation:resolve',
    'user:view_profile',
    'moderation:comments',
    'moderation:users',
    'moderation:reports',
    'shop:redeem',
    'message:send',
    'notification:manage',
  ],
  ADMIN: [
    'novel:publish',
    'novel:edit_own',
    'novel:edit_any',
    'novel:delete_own',
    'novel:delete_any',
    'chapter:publish',
    'chapter:edit_own',
    'chapter:edit_any',
    'chapter:delete_own',
    'chapter:delete_any',
    'comment:post',
    'comment:delete_own',
    'comment:delete_any',
    'annotation:create',
    'annotation:view',
    'annotation:resolve',
    'user:view_profile',
    'user:manage',
    'user:manage_role',
    'admin:dashboard',
    'admin:analytics',
    'admin:users',
    'admin:novels',
    'admin:permissions',
    'moderation:comments',
    'moderation:users',
    'moderation:reports',
    'vip:ad_free',
    'vip:exclusive_badge',
    'vip:priority_updates',
    'vip:early_access',
    'search:rebuild',
    'shop:redeem',
    'message:send',
    'notification:manage',
  ],
}

export function getRolePermissions(role: Role): PermissionCode[] {
  return ROLE_PERMISSIONS[role] || []
}

export function getPermissionDefinition(code: PermissionCode): PermissionDefinition | undefined {
  return PERMISSION_DEFINITIONS.find(p => p.code === code)
}

export function getPermissionsByCategory(category: string): PermissionDefinition[] {
  return PERMISSION_DEFINITIONS.filter(p => p.category === category)
}

export function getAllCategories(): string[] {
  return [...new Set(PERMISSION_DEFINITIONS.map(p => p.category))]
}

export const ROLE_LABELS: Record<Role, string> = {
  USER: '普通用户',
  ADMIN: '管理员',
  AUTHOR: '认证作者',
  VIP: '付费会员',
  MODERATOR: '版主',
}
