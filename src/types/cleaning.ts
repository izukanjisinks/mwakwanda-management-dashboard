export type CleaningFrequency = 'daily' | 'every_2_days' | 'weekly' | 'after_checkout'

export interface RoomCleaningAssignment {
  room_id: string
  staff_id: string
  frequency: CleaningFrequency
}
