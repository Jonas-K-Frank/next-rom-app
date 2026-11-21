export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      prices: {
        Row: {
          id: string
          in_stock: boolean
          link_id: string
          price: number
          scraped_at: string
        }
        Insert: {
          id?: string
          in_stock?: boolean
          link_id: string
          price: number
          scraped_at?: string
        }
        Update: {
          id?: string
          in_stock?: boolean
          link_id?: string
          price?: number
          scraped_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prices_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "product_retailer_links"
            referencedColumns: ["id"]
          },
        ]
      }
      product_retailer_links: {
        Row: {
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          product_id: string
          product_url: string
          retailer_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          product_id: string
          product_url: string
          retailer_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          product_id?: string
          product_url?: string
          retailer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_retailer_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_retailer_links_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          abv: number | null
          brand: string | null
          category: string | null
          country: string | null
          created_at: string
          description: string | null
          description_generated: string | null
          description_source: string | null
          description_status: string | null
          id: string
          image_url: string | null
          name: string
          normalized_name: string | null
          volume_ml: number | null
        }
        Insert: {
          abv?: number | null
          brand?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          description_generated?: string | null
          description_source?: string | null
          description_status?: string | null
          id?: string
          image_url?: string | null
          name: string
          normalized_name?: string | null
          volume_ml?: number | null
        }
        Update: {
          abv?: number | null
          brand?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          description_generated?: string | null
          description_source?: string | null
          description_status?: string | null
          id?: string
          image_url?: string | null
          name?: string
          normalized_name?: string | null
          volume_ml?: number | null
        }
        Relationships: []
      }
      retailers: {
        Row: {
          base_url: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          base_url: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          base_url?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      stg_foetex_dk: {
        Row: {
          abv: number | null
          description: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          price_dkk: number | null
          scraped_at: string | null
          url: string | null
          volume_cl: number | null
        }
        Insert: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Update: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Relationships: []
      }
      stg_hjhansen_vin_dk: {
        Row: {
          abv: number | null
          description: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          price_dkk: number | null
          scraped_at: string | null
          url: string | null
          volume_cl: number | null
        }
        Insert: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Update: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Relationships: []
      }
      stg_juuls_dk: {
        Row: {
          abv: number | null
          description: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          price_dkk: number | null
          scraped_at: string | null
          url: string | null
          volume_cl: number | null
        }
        Insert: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Update: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Relationships: []
      }
      stg_kokkensvinhus_dk: {
        Row: {
          abv: number | null
          description: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          price_dkk: number | null
          scraped_at: string | null
          url: string | null
          volume_cl: number | null
        }
        Insert: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Update: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Relationships: []
      }
      stg_rombo_dk: {
        Row: {
          abv: number | null
          description: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          price_dkk: number | null
          scraped_at: string | null
          url: string | null
          volume_cl: number | null
        }
        Insert: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Update: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Relationships: []
      }
      stg_spitus_dk: {
        Row: {
          abv: number | null
          description: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          price_dkk: number | null
          scraped_at: string | null
          url: string | null
          volume_cl: number | null
        }
        Insert: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Update: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Relationships: []
      }
      stg_uhrskov_dk: {
        Row: {
          abv: number | null
          description: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          price_dkk: number | null
          scraped_at: string | null
          url: string | null
          volume_cl: number | null
        }
        Insert: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Update: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Relationships: []
      }
      stg_vinmedmere_dk: {
        Row: {
          abv: number | null
          description: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          price_dkk: number | null
          scraped_at: string | null
          url: string | null
          volume_cl: number | null
        }
        Insert: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Update: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Relationships: []
      }
      stg_whisky_dk: {
        Row: {
          abv: number | null
          debug_error_messages: Json | null
          debug_loaded_url: string | null
          debug_method: string | null
          debug_request_id: string | null
          debug_retry_count: number | null
          debug_status_code: number | null
          debug_url: string | null
          description: string | null
          error: boolean | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          price_dkk: number | null
          price_dkk_formatted: string | null
          scraped_at: string | null
          shop: string | null
          url: string | null
          volume_cl: number | null
        }
        Insert: {
          abv?: number | null
          debug_error_messages?: Json | null
          debug_loaded_url?: string | null
          debug_method?: string | null
          debug_request_id?: string | null
          debug_retry_count?: number | null
          debug_status_code?: number | null
          debug_url?: string | null
          description?: string | null
          error?: boolean | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          price_dkk_formatted?: string | null
          scraped_at?: string | null
          shop?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Update: {
          abv?: number | null
          debug_error_messages?: Json | null
          debug_loaded_url?: string | null
          debug_method?: string | null
          debug_request_id?: string | null
          debug_retry_count?: number | null
          debug_status_code?: number | null
          debug_url?: string | null
          description?: string | null
          error?: boolean | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          price_dkk_formatted?: string | null
          scraped_at?: string | null
          shop?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Relationships: []
      }
      stg_whiskyeksperten_dk: {
        Row: {
          abv: number | null
          description: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          price_dkk: number | null
          scraped_at: string | null
          url: string | null
          volume_cl: number | null
        }
        Insert: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Update: {
          abv?: number | null
          description?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          price_dkk?: number | null
          scraped_at?: string | null
          url?: string | null
          volume_cl?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      catalog_stats: {
        Row: {
          product_count: number | null
          retailer_count: number | null
        }
        Relationships: []
      }
      latest_prices: {
        Row: {
          id: string | null
          in_stock: boolean | null
          link_id: string | null
          price: number | null
          scraped_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "product_retailer_links"
            referencedColumns: ["id"]
          },
        ]
      }
      product_lowest_prices: {
        Row: {
          highest_price: number | null
          lowest_price: number | null
          product_id: string | null
          retailer_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_retailer_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_drops: {
        Row: {
          best_price_drop_pct: number | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_retailer_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decode_entities: { Args: { raw: string }; Returns: string }
      extract_numbers: { Args: { raw: string }; Returns: string }
      import_shop: {
        Args: {
          p_base_url: string
          p_category?: string
          p_shop_name: string
          p_staging: string
        }
        Returns: {
          links: number
          priser: number
          produkter: number
        }[]
      }
      normalize_name: { Args: { raw: string }; Returns: string }
      normalize_name_v2: { Args: { raw: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
