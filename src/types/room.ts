export type RoomType = 'single' | 'double' | 'suite' | 'cabin' | 'conference'

export interface Room {
  id: string
  name: string
  type: RoomType
  capacity: number
  price_per_night: number
  amenities: string[]
  is_available: boolean
  description?: string
  images: string[]
  created_at: string
  updated_at: string
}

export interface RoomPayload {
  name: string
  type: RoomType
  capacity: number
  price_per_night: number
  amenities: string[]
  is_available: boolean
  description?: string
}

export interface PaginatedRooms {
  data: Room[]
  page: number
  page_size: number
  total: number
}

export interface RoomStatusOccupant {
  assignment_id: string
  booking_id: string
  booking_number: string
  name: string
  phone?: string
  check_out: string
  overstaying: boolean
}

export interface RoomStatus {
  room: Room
  occupants: RoomStatusOccupant[]
}
