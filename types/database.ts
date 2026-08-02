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
      admin_users: {
        Row: {
          user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          slug: string
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          is_active?: boolean
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          category_id: string | null
          name: string
          slug: string
          description: string | null
          ingredients: string | null
          shipping_info: string | null
          storage_tips: string | null
          has_variations: boolean
          base_price: number | null
          base_weight_kg: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          slug: string
          description?: string | null
          ingredients?: string | null
          shipping_info?: string | null
          storage_tips?: string | null
          has_variations?: boolean
          base_price?: number | null
          base_weight_kg?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          ingredients?: string | null
          shipping_info?: string | null
          storage_tips?: string | null
          has_variations?: boolean
          base_price?: number | null
          base_weight_kg?: number | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      product_variations: {
        Row: {
          id: string
          product_id: string
          attributes: Json
          sku: string | null
          price: number
          weight_kg: number
          stock: number
          is_active: boolean
        }
        Insert: {
          id?: string
          product_id: string
          attributes?: Json
          sku?: string | null
          price: number
          weight_kg: number
          stock?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          product_id?: string
          attributes?: Json
          sku?: string | null
          price?: number
          weight_kg?: number
          stock?: number
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          variation_id: string | null
          url: string
          sort_order: number
          is_main: boolean
          cloudinary_public_id: string | null
        }
        Insert: {
          id?: string
          product_id: string
          variation_id?: string | null
          url: string
          sort_order?: number
          is_main?: boolean
          cloudinary_public_id?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          variation_id?: string | null
          url?: string
          sort_order?: number
          is_main?: boolean
          cloudinary_public_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variation_id_fkey"
            columns: ["variation_id"]
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          }
        ]
      }
      customer_profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          default_address_line1: string | null
          default_address_line2: string | null
          default_city: string | null
          default_district: string | null
          default_postal_code: string | null
          default_country_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          default_address_line1?: string | null
          default_address_line2?: string | null
          default_city?: string | null
          default_district?: string | null
          default_postal_code?: string | null
          default_country_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          default_address_line1?: string | null
          default_address_line2?: string | null
          default_city?: string | null
          default_district?: string | null
          default_postal_code?: string | null
          default_country_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_default_country_id_fkey"
            columns: ["default_country_id"]
            referencedRelation: "countries"
            referencedColumns: ["id"]
          }
        ]
      }
      countries: {
        Row: {
          id: string
          name: string
          code: string
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          code: string
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          code?: string
          is_active?: boolean
        }
        Relationships: []
      }
      shipping_tiers: {
        Row: {
          id: string
          country_id: string
          weight_kg: number
          price: number
        }
        Insert: {
          id?: string
          country_id: string
          weight_kg: number
          price: number
        }
        Update: {
          id?: string
          country_id?: string
          weight_kg?: number
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipping_tiers_country_id_fkey"
            columns: ["country_id"]
            referencedRelation: "countries"
            referencedColumns: ["id"]
          }
        ]
      }
      coupons: {
        Row: {
          id: string
          code: string
          type: 'percent' | 'fixed'
          value: number
          min_order_value: number
          usage_limit: number | null
          usage_count: number
          per_customer_limit: number | null
          applicable_product_ids: string[] | null
          applicable_category_ids: string[] | null
          valid_from: string | null
          valid_until: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          code: string
          type: 'percent' | 'fixed'
          value: number
          min_order_value?: number
          usage_limit?: number | null
          usage_count?: number
          per_customer_limit?: number | null
          applicable_product_ids?: string[] | null
          applicable_category_ids?: string[] | null
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          code?: string
          type?: 'percent' | 'fixed'
          value?: number
          min_order_value?: number
          usage_limit?: number | null
          usage_count?: number
          per_customer_limit?: number | null
          applicable_product_ids?: string[] | null
          applicable_category_ids?: string[] | null
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      legal_pages: {
        Row: {
          id: string
          slug: string
          title: string
          content: string
          is_published: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          content: string
          is_published?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          content?: string
          is_published?: boolean
          updated_at?: string
        }
        Relationships: []
      }

      orders: {
        Row: {
          id: string
          order_number: string | null
          customer_id: string | null
          guest_name: string | null
          guest_email: string | null
          guest_phone: string | null
          address_line1: string
          address_line2: string | null
          city: string
          district: string | null
          postal_code: string | null
          country_id: string
          coupon_id: string | null
          subtotal: number
          discount_amount: number
          total_weight_kg: number
          shipping_cost: number
          total_amount: number
          payment_method: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          order_number?: string | null
          customer_id?: string | null
          guest_name?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          address_line1: string
          address_line2?: string | null
          city: string
          district?: string | null
          postal_code?: string | null
          country_id: string
          coupon_id?: string | null
          subtotal: number
          discount_amount?: number
          total_weight_kg: number
          shipping_cost: number
          total_amount: number
          payment_method?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          order_number?: string | null
          customer_id?: string | null
          guest_name?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          address_line1?: string
          address_line2?: string | null
          city?: string
          district?: string | null
          postal_code?: string | null
          country_id?: string
          coupon_id?: string | null
          subtotal?: number
          discount_amount?: number
          total_weight_kg?: number
          shipping_cost?: number
          total_amount?: number
          payment_method?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_country_id_fkey"
            columns: ["country_id"]
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          }
        ]
      }
      coupon_redemptions: {
        Row: {
          id: string
          coupon_id: string
          order_id: string
          customer_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          coupon_id: string
          order_id: string
          customer_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          coupon_id?: string
          order_id?: string
          customer_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          variation_id: string | null
          quantity: number
          unit_price: number
          unit_weight_kg: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          variation_id?: string | null
          quantity: number
          unit_price: number
          unit_weight_kg: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          variation_id?: string | null
          quantity?: number
          unit_price?: number
          unit_weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variation_id_fkey"
            columns: ["variation_id"]
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          }
        ]
      }
      hero_slides: {
        Row: {
          id: string
          image_url: string
          cloudinary_public_id: string | null
          link_url: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          image_url: string
          cloudinary_public_id?: string | null
          link_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          cloudinary_public_id?: string | null
          link_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      homepage_categories: {
        Row: {
          id: string
          category_id: string
          image_url: string
          cloudinary_public_id: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          image_url: string
          cloudinary_public_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          image_url?: string
          cloudinary_public_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_categories_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      customer_order_stats: {
        Row: {
          customer_id: string
          full_name: string | null
          phone: string | null
          default_address_line1: string | null
          default_address_line2: string | null
          default_city: string | null
          default_district: string | null
          default_postal_code: string | null
          default_country_id: string | null
          profile_created_at: string
          total_orders_count: number
          total_lifetime_spend: number
          last_order_date: string | null
          first_order_date: string | null
        }
      }
      guest_customer_stats: {
        Row: {
          guest_email: string
          guest_name: string | null
          guest_phone: string | null
          last_address_line1: string | null
          last_city: string | null
          last_district: string | null
          total_orders_count: number
          total_lifetime_spend: number
          last_order_date: string | null
          first_order_date: string | null
        }
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      decrement_variation_stock: {
        Args: {
          p_variation_id: string
          p_quantity: number
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience helper type exports
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type LegalPage = Database['public']['Tables']['legal_pages']['Row']
export type HeroSlide = Database['public']['Tables']['hero_slides']['Row']
export type HomepageCategory = Database['public']['Tables']['homepage_categories']['Row']
export interface HomepageCategoryWithCategory extends HomepageCategory {
  categories?: Pick<Tables<'categories'>, 'id' | 'name' | 'slug' | 'is_active'> | null
}


