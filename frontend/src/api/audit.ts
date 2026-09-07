import { api } from './client'
import type { AuditLog } from '../types/api'

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  const res = await api.get<AuditLog[]>('/audit-logs', { params: { limit } })
  return res.data
}
