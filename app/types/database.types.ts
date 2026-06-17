export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plants: {
        Row: {
          id: string
          category_id: string
          name: string
          short_description: string | null
          description: string | null
          care_guide: string | null
          caution: string | null
          care_level: 'easy' | 'normal' | 'hard'
          page_bg_color: string | null
          page_bg_image: string | null
          page_font: 'sans' | 'serif' | 'mono'
          image_position: string
          image_scale: number
          overlay_opacity: number
          price: number
          stock: number
          image_urls: string[]
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          short_description?: string | null
          description?: string | null
          care_guide?: string | null
          caution?: string | null
          care_level?: 'easy' | 'normal' | 'hard'
          page_bg_color?: string | null
          page_bg_image?: string | null
          page_font?: 'sans' | 'serif' | 'mono'
          image_position?: string
          image_scale?: number
          overlay_opacity?: number
          price: number
          stock?: number
          image_urls?: string[]
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          name?: string
          short_description?: string | null
          description?: string | null
          care_guide?: string | null
          caution?: string | null
          care_level?: 'easy' | 'normal' | 'hard'
          page_bg_color?: string | null
          page_bg_image?: string | null
          page_font?: 'sans' | 'serif' | 'mono'
          image_position?: string
          image_scale?: number
          overlay_opacity?: number
          price?: number
          stock?: number
          image_urls?: string[]
          is_deleted?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
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
        Insert: {
          id?: string
          status?: OrderStatus
          total_amount: number
          buyer_name?: string | null
          buyer_phone?: string | null
          buyer_email?: string | null
          shipping_address?: string | null
          portone_payment_id?: string | null
        }
        Update: {
          status?: OrderStatus
          total_amount?: number
          buyer_name?: string | null
          buyer_phone?: string | null
          buyer_email?: string | null
          shipping_address?: string | null
          portone_payment_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          plant_id: string | null
          plant_name: string
          unit_price: number
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          plant_id?: string | null
          plant_name: string
          unit_price: number
          quantity: number
        }
        Update: {
          quantity?: number
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          id: string
          session_id: string
          plant_id: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          plant_id: string
          quantity?: number
        }
        Update: {
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// 편의 타입 alias (composables에서 사용)
type Tables = Database['public']['Tables']

export type CategoryRow = Tables['categories']['Row']
export type CategoryInsert = Tables['categories']['Insert']
export type CategoryUpdate = Tables['categories']['Update']

export type PlantRow = Tables['plants']['Row']
export type PlantInsert = Tables['plants']['Insert']
export type PlantUpdate = Tables['plants']['Update']

export type OrderRow = Tables['orders']['Row']
export type OrderInsert = Tables['orders']['Insert']
export type OrderUpdate = Tables['orders']['Update']

export type OrderItemRow = Tables['order_items']['Row']
export type OrderItemInsert = Tables['order_items']['Insert']
export type OrderItemUpdate = Tables['order_items']['Update']

export type CartItemRow = Tables['cart_items']['Row']
export type CartItemInsert = Tables['cart_items']['Insert']
export type CartItemUpdate = Tables['cart_items']['Update']
