export interface PaginatedMenuItems {
  data: MenuItem[]
  page: number
  page_size: number
  total: number
}

export interface Menu {
  id: string
  org_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  items?: PaginatedMenuItems
}

export type MenuCategory =
  | 'appetizer'
  | 'main_course'
  | 'dessert'
  | 'beverage'
  | 'breakfast'
  | 'brunch'
  | 'soup'
  | 'salad'
  | 'side_dish'
  | 'special'
  | 'buffet'
  | 'drinks'
export const MENU_CATEGORIES: { value: MenuCategory; label: string }[] = [
  { value: 'appetizer', label: 'Appetizers (Starters)' },
  { value: 'soup', label: 'Soups' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'salad', label: 'Salads' },
  { value: 'main_course', label: 'Main Course' },
  { value: 'side_dish', label: 'Side Dishes' },
  { value: 'dessert', label: 'Desserts' },
  { value: 'beverage', label: 'Beverages' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'special', label: "Chef's Special" },
  { value: 'buffet', label: "Executive Buffet" },
]

export interface MenuItem {
  id: string
  menu_id: string
  name: string
  description?: string
  price: number
  category?: MenuCategory
  image_url?: string
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  menu_item?: MenuItem
  item_name?: string
  attendee_id?: string
  attendee_name?: string
  quantity: number
  unit_price?: number
  subtotal?: number
  total?: number
  notes?: string
  created_at?: string
}

export interface Order {
  id: string
  order_number: string
  booking_id?: string
  attendee_id?: string
  invoice_id?: string
  booking_number?: string
  room_name?: string
  client_name?: string
  company_name?: string
  attendee_name?: string
  type: 'in_house' | 'walk_in'
  status?: 'open' | 'closed'
  notes?: string
  total?: number
  meal_period?: string
  serving_time?: string
  scheduled_for?: string
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface CloseWalkInOrderPayload {
  client_name: string
  client_type: 'individual' | 'corporate'
  client_email?: string
  client_phone?: string
  client_tpin?: string
  due_date?: string
  notes?: string
}

export interface InHouseGuest {
  BookingID: string
  BookingNumber: string
  AttendeeID: string | null
  GuestName: string
  RoomName: string
  CompanyName: string
}

export interface PaginatedOrders {
  data: Order[]
  page: number
  page_size: number
  total: number
}

export interface MenuPayload {
  name: string
  description?: string
  is_active: boolean
}

export interface MenuItemPayload {
  name: string
  description?: string
  price: number
  category?: MenuCategory
  image_url?: string
  is_available: boolean
}

export interface OrderItemInput {
  menu_item_id: string
  quantity: number
  notes?: string
}

export interface PlaceInHouseOrderPayload {
  booking_id: string
  attendee_id?: string
  notes?: string
  items: OrderItemInput[]
}

export interface PlaceWalkInOrderPayload {
  notes?: string
  items: OrderItemInput[]
}

export interface AddOrderItemsPayload {
  items: OrderItemInput[]
}

export interface UpdateOrderItemPayload {
  quantity: number
}
