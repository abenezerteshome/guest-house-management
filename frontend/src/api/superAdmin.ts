import { api } from './client'
import type { Property, PropertyCreate, PropertyUpdate, SuperAdminStats } from '../types/api'

export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  const res = await api.get<SuperAdminStats>('/super-admin/stats')
  return res.data
}

export async function getProperties(params?: { search?: string; is_active?: boolean }): Promise<Property[]> {
  const res = await api.get<Property[]>('/super-admin/properties', { params })
  return res.data
}

export async function getProperty(id: number): Promise<Property> {
  const res = await api.get<Property>(`/super-admin/properties/${id}`)
  return res.data
}

export async function createProperty(data: PropertyCreate): Promise<Property> {
  const res = await api.post<Property>('/super-admin/properties', data)
  return res.data
}

export async function updateProperty(id: number, data: PropertyUpdate): Promise<Property> {
  const res = await api.patch<Property>(`/super-admin/properties/${id}`, data)
  return res.data
}

export async function togglePropertyStatus(id: number, isActive: boolean): Promise<Property> {
  const res = await api.patch<Property>(`/super-admin/properties/${id}/status`, { is_active: isActive })
  return res.data
}
