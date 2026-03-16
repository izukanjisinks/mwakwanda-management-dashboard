export type RoomType = 'single' | 'double' | 'suite' | 'cabin' | 'conference'

export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'not_ready'

export interface Room {
  id: number
  name: string
  type: RoomType
  capacity: number
  price_per_night: number
  amenities: string[]
  status: RoomStatus
  description?: string
  created_at: string
}

export interface RoomPayload {
  name: string
  type: RoomType
  capacity: number
  price_per_night: number
  amenities: string[]
  status: RoomStatus
  description?: string
}

export interface RoomSummary {
  occupied: number
  reserved: number
  available: number
  not_ready: number
}
