export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: CategoryRow
        Insert: CategoryInsert
        Update: CategoryUpdate
      }
      plants: {
        Row: PlantRow
        Insert: PlantInsert
        Update: PlantUpdate
      }
      orders: {
        Row: OrderRow
        Insert: OrderInsert
        Update: OrderUpdate
      }
      order_items: {
        Row: OrderItemRow
        Insert: OrderItemInsert
        Update: OrderItemUpdate
      }
      cart_items: {
        Row: CartItemRow
        Insert: CartItemInsert
        Update: CartItemUpdate
      }
    }
  }
}

// ============================================================
// categories
// ============================================================

export interface CategoryRow {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface CategoryInsert {
  id?: string
  name: string
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface CategoryUpdate {
  name?: string
  description?: string | null
  updated_at?: string
}

// ============================================================
// plants
// ============================================================

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export interface PlantRow {
  id: string
  category_id: string
  name: string
  short_description: string | null
  description: string | null
  care_guide: string | null
  caution: string | null
  price: number
  stock: number
  image_urls: string[]
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface PlantInsert {
  id?: string
  category_id: string
  name: string
  short_description?: string | null
  description?: string | null
  care_guide?: string | null
  caution?: string | null
  price: number
  stock?: number
  image_urls?: string[]
  is_deleted?: boolean
  created_at?: string
  updated_at?: string
}

export interface PlantUpdate {
  category_id?: string
  name?: string
  short_description?: string | null
  description?: string | null
  care_guide?: string | null
  caution?: string | null
  price?: number
  stock?: number
  image_urls?: string[]
  is_deleted?: boolean
  updated_at?: string
}

// ============================================================
// orders
// ============================================================

export interface OrderRow {
  id: string
  status: OrderStatus
  total_amount: number
  buyer_name: string | null
  buyer_phone: string | null
  buyer_email: string | null
  shipping_address: string | null
  portone_payment_id: string | null
  created_at: string
  updated_at: string
}

export interface OrderInsert {
  id?: string
  status?: OrderStatus
  total_amount: number
  buyer_name?: string | null
  buyer_phone?: string | null
  buyer_email?: string | null
  shipping_address?: string | null
  portone_payment_id?: string | null
}

export interface OrderUpdate {
  status?: OrderStatus
  total_amount?: number
  buyer_name?: string | null
  buyer_phone?: string | null
  buyer_email?: string | null
  shipping_address?: string | null
  portone_payment_id?: string | null
  updated_at?: string
}

// ============================================================
// order_items
// ============================================================

export interface OrderItemRow {
  id: string
  order_id: string
  plant_id: string | null
  plant_name: string
  unit_price: number
  quantity: number
  created_at: string
}

export interface OrderItemInsert {
  id?: string
  order_id: string
  plant_id?: string | null
  plant_name: string
  unit_price: number
  quantity: number
}

export interface OrderItemUpdate {
  quantity?: number
}

// ============================================================
// cart_items
// ============================================================

export interface CartItemRow {
  id: string
  session_id: string
  plant_id: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface CartItemInsert {
  id?: string
  session_id: string
  plant_id: string
  quantity?: number
}

export interface CartItemUpdate {
  quantity?: number
  updated_at?: string
}
