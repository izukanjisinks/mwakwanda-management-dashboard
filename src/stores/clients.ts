import { defineStore } from 'pinia'
import { ref } from 'vue'
import { individualClientApi, corporateClientApi } from '@/services/api/clients'
import type {
  IndividualClient,
  IndividualClientPayload,
  CorporateClient,
  CorporateClientPayload,
} from '@/types/client'

export const useIndividualClientsStore = defineStore('individualClients', () => {
  const clients = ref<IndividualClient[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchClients(page = 1, pageSize = 100) {
    loading.value = true
    error.value = null
    try {
      const res = await individualClientApi.list({ page, page_size: pageSize })
      clients.value = res.data
      total.value = res.total
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load clients.'
    } finally {
      loading.value = false
    }
  }

  async function createClient(payload: IndividualClientPayload): Promise<IndividualClient> {
    const client = await individualClientApi.create(payload)
    clients.value.push(client)
    total.value++
    return client
  }

  async function updateClient(id: string, payload: Partial<IndividualClientPayload>): Promise<IndividualClient> {
    const updated = await individualClientApi.update(id, payload)
    const idx = clients.value.findIndex(c => c.id === id)
    if (idx !== -1) clients.value[idx] = updated
    return updated
  }

  async function deleteClient(id: string): Promise<void> {
    await individualClientApi.delete(id)
    clients.value = clients.value.filter(c => c.id !== id)
    total.value--
  }

  return { clients, total, loading, error, fetchClients, createClient, updateClient, deleteClient }
})

export const useCorporateClientsStore = defineStore('corporateClients', () => {
  const clients = ref<CorporateClient[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchClients(page = 1, pageSize = 100) {
    loading.value = true
    error.value = null
    try {
      const res = await corporateClientApi.list({ page, page_size: pageSize })
      clients.value = res.data
      total.value = res.total
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load clients.'
    } finally {
      loading.value = false
    }
  }

  async function createClient(payload: CorporateClientPayload): Promise<CorporateClient> {
    const client = await corporateClientApi.create(payload)
    clients.value.push(client)
    total.value++
    return client
  }

  async function updateClient(id: string, payload: Partial<CorporateClientPayload>): Promise<CorporateClient> {
    const updated = await corporateClientApi.update(id, payload)
    const idx = clients.value.findIndex(c => c.id === id)
    if (idx !== -1) clients.value[idx] = updated
    return updated
  }

  async function deleteClient(id: string): Promise<void> {
    await corporateClientApi.delete(id)
    clients.value = clients.value.filter(c => c.id !== id)
    total.value--
  }

  return { clients, total, loading, error, fetchClients, createClient, updateClient, deleteClient }
})
