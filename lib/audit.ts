import { supabase } from '@/lib/supabase'

export type AuditAction =
  | 'expense.add'   | 'expense.edit'   | 'expense.delete'
  | 'kid.add'       | 'kid.edit'       | 'kid.delete'
  | 'parent.invite' | 'parent.join'    | 'parent.remove'
  | 'category.add'  | 'category.edit'  | 'category.delete'
  | 'profile.edit'

export interface AuditEntry {
  id: string
  household_id: string
  user_id: string | null
  actor_name: string | null
  action: AuditAction
  entity: string | null
  detail: string | null
  created_at: string
}

export async function logAudit(params: {
  household_id: string
  user_id: string
  actor_name: string
  action: AuditAction
  entity?: string
  detail?: string
}) {
  await supabase.from('audit_log').insert({
    household_id: params.household_id,
    user_id:      params.user_id,
    actor_name:   params.actor_name,
    action:       params.action,
    entity:       params.entity ?? null,
    detail:       params.detail ?? null,
  })
}

export function actionLabel(action: AuditAction): string {
  const map: Record<AuditAction, string> = {
    'expense.add':     'Added expense',
    'expense.edit':    'Edited expense',
    'expense.delete':  'Deleted expense',
    'kid.add':         'Added child',
    'kid.edit':        'Updated child',
    'kid.delete':      'Removed child',
    'parent.invite':   'Invited co-parent',
    'parent.join':     'Co-parent joined',
    'parent.remove':   'Removed co-parent',
    'category.add':    'Added category',
    'category.edit':   'Updated category',
    'category.delete': 'Deleted category',
    'profile.edit':    'Updated profile',
  }
  return map[action] ?? action
}

export function actionColor(action: AuditAction): string {
  if (action.endsWith('.delete') || action.endsWith('.remove')) return '#dc2626'
  if (action.endsWith('.add') || action.endsWith('.join'))      return '#059669'
  if (action.endsWith('.edit') || action.endsWith('.invite'))   return '#2563eb'
  return '#64748b'
}

export function actionIcon(action: AuditAction): string {
  if (action.startsWith('expense')) return '💸'
  if (action.startsWith('kid'))     return '👶'
  if (action.startsWith('parent'))  return '👤'
  if (action.startsWith('category'))return '🏷️'
  if (action.startsWith('profile')) return '✏️'
  return '📋'
}

export function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}
