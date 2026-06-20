export type VenueType = 'conference_hall' | 'event_space' | 'boardroom' | 'outdoor' | 'dining'
export type VenueRateType = 'hourly' | 'daily'

export interface Venue {
  id: string
  name: string
  venue_type: VenueType
  capacity: number
  area_sqm?: number
  floor?: string
  base_rate: number
  rate_type: VenueRateType
  amenities: string[]
  images: string[]
  is_available: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface VenuePayload {
  name: string
  venue_type: VenueType
  capacity: number
  area_sqm?: number
  floor?: string
  base_rate: number
  rate_type: VenueRateType
  amenities: string[]
  is_available: boolean
  notes?: string
}

export interface PaginatedVenues {
  data: Venue[]
  page: number
  page_size: number
  total: number
}
