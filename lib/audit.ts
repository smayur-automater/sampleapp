import { supabase } from './supabase'

export async function logAudit(params: {
  household_id: string
  user_id: string
  actor_name: string
  action: string
  entity?: string
  detail?: string
}) {
  try {
    await supabase.from('audit_log').insert({
      household_id: params.household_id,
      user_id:      params.user_id,
      actor_name:   params.actor_name,
      action:       params.action,
      entity:       params.entity ?? null,
      detail:       params.detail ?? null,
    })
  } catch { /* non-fatal */ }
}
