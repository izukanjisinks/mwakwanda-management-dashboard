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
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchClients() {
    loading.value = true
    error.value = null
    try {
      clients.value = await individualClientApi.list()
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load clients.'
      if (import.meta.env.DEV && clients.value.length === 0) {
        clients.value = DEV_MOCK_INDIVIDUAL
      }
    } finally {
      loading.value = false
    }
  }

  async function createClient(payload: IndividualClientPayload): Promise<IndividualClient> {
    const client = await individualClientApi.create(payload)
    clients.value.push(client)
    return client
  }

  async function updateClient(id: number, payload: Partial<IndividualClientPayload>): Promise<IndividualClient> {
    const updated = await individualClientApi.update(id, payload)
    const idx = clients.value.findIndex(c => c.id === id)
    if (idx !== -1) clients.value[idx] = updated
    return updated
  }

  async function deleteClient(id: number): Promise<void> {
    await individualClientApi.delete(id)
    clients.value = clients.value.filter(c => c.id !== id)
  }

  return { clients, loading, error, fetchClients, createClient, updateClient, deleteClient }
})

export const useCorporateClientsStore = defineStore('corporateClients', () => {
  const clients = ref<CorporateClient[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchClients() {
    loading.value = true
    error.value = null
    try {
      clients.value = await corporateClientApi.list()
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load clients.'
      if (import.meta.env.DEV && clients.value.length === 0) {
        clients.value = DEV_MOCK_CORPORATE
      }
    } finally {
      loading.value = false
    }
  }

  async function createClient(payload: CorporateClientPayload): Promise<CorporateClient> {
    const client = await corporateClientApi.create(payload)
    clients.value.push(client)
    return client
  }

  async function updateClient(id: number, payload: Partial<CorporateClientPayload>): Promise<CorporateClient> {
    const updated = await corporateClientApi.update(id, payload)
    const idx = clients.value.findIndex(c => c.id === id)
    if (idx !== -1) clients.value[idx] = updated
    return updated
  }

  async function deleteClient(id: number): Promise<void> {
    await corporateClientApi.delete(id)
    clients.value = clients.value.filter(c => c.id !== id)
  }

  return { clients, loading, error, fetchClients, createClient, updateClient, deleteClient }
})

// Dev mock data
const DEV_MOCK_INDIVIDUAL: IndividualClient[] = [
  { id: 1, full_name: 'John Mwale', email: 'john.mwale@email.com', phone: '+260 97 123 4567', id_passport_number: 'NRC-123456/78/1', nationality: 'Zambian', status: 'active', created_at: '2025-01-10T00:00:00Z' },
  { id: 2, full_name: 'Sarah Johnson', email: 'sarah.j@gmail.com', phone: '+44 7911 123456', id_passport_number: 'P-GBR-987654321', nationality: 'British', status: 'active', created_at: '2025-02-01T00:00:00Z' },
  { id: 3, full_name: 'David Banda', email: 'david.banda@yahoo.com', phone: '+260 96 234 5678', id_passport_number: 'NRC-234567/89/2', nationality: 'Zambian', status: 'active', created_at: '2025-02-14T00:00:00Z' },
  { id: 4, full_name: 'Emily Roberts', email: 'emily.roberts@outlook.com', phone: '+1 555 234 5678', id_passport_number: 'P-USA-123456789', nationality: 'American', status: 'inactive', created_at: '2025-03-01T00:00:00Z' },
  { id: 5, full_name: 'Mutale Chanda', email: 'mutale.c@gmail.com', phone: '+260 95 345 6789', id_passport_number: 'NRC-345678/90/3', nationality: 'Zambian', status: 'active', created_at: '2025-03-15T00:00:00Z' },
  { id: 6, full_name: 'Pierre Dubois', email: 'p.dubois@email.fr', phone: '+33 6 12 34 56 78', id_passport_number: 'P-FRA-456789012', nationality: 'French', status: 'active', created_at: '2025-04-01T00:00:00Z' },
]

const DEV_MOCK_CORPORATE: CorporateClient[] = [
  { id: 1, company_name: 'Zambia National Bank', contact_person: 'Charles Mwanza', email: 'c.mwanza@znb.co.zm', phone: '+260 21 123 4567', company_reg_number: 'ZNB-001-2010', industry: 'Banking & Finance', status: 'active', created_at: '2025-01-05T00:00:00Z' },
  { id: 2, company_name: 'Copper Belt Mining Ltd', contact_person: 'Grace Tembo', email: 'g.tembo@cbmining.co.zm', phone: '+260 21 234 5678', company_reg_number: 'CBM-042-2015', industry: 'Mining', status: 'active', created_at: '2025-01-20T00:00:00Z' },
  { id: 3, company_name: 'Safari Tours International', contact_person: 'James Phiri', email: 'j.phiri@safaritours.com', phone: '+260 97 456 7890', company_reg_number: 'STI-099-2018', industry: 'Tourism', status: 'active', created_at: '2025-02-10T00:00:00Z' },
  { id: 4, company_name: 'Lusaka Tech Solutions', contact_person: 'Naledi Moyo', email: 'n.moyo@lusakatech.co.zm', phone: '+260 96 567 8901', company_reg_number: 'LTS-201-2020', industry: 'Technology', status: 'inactive', created_at: '2025-03-05T00:00:00Z' },
]
