import { apiRequest } from './api-client'
import { ServiceStatus } from '@/types'

interface HealthData {
  status: string
  service: string
  version: string
}

export async function getAIServiceHealth(): Promise<{ status: ServiceStatus; data?: HealthData }> {
  try {
    const res = await apiRequest<{ success: boolean; data?: HealthData; error?: unknown }>('/ai-service/health')
    if (res.success && res.data?.status === 'ok') {
      return { status: 'online', data: res.data }
    }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}

export async function getModelInfo(): Promise<unknown> {
  const res = await apiRequest<{ success: boolean; data: unknown }>('/ai-service/model-info')
  return res.data
}
