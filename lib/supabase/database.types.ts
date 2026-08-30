// Håndskrevne typer der matcher supabase/migrations/*.sql.
// Når Supabase-projektet er oprettet, kan denne fil erstattes med output fra
// `supabase gen types typescript` for at holde typerne i sync automatisk.

export interface Database {
  public: {
    Tables: {
      retailers: {
        Row: {
          id: string;
          name: string;
          base_url: string;
          logo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          base_url: string;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["retailers"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          brand: string | null;
          volume_ml: number | null;
          abv: number | null;
          category: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand?: string | null;
          volume_ml?: number | null;
          abv?: number | null;
          category?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      product_retailer_links: {
        Row: {
          id: string;
          product_id: string;
          retailer_id: string;
          product_url: string;
          external_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          retailer_id: string;
          product_url: string;
          external_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["product_retailer_links"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "product_retailer_links_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_retailer_links_retailer_id_fkey";
            columns: ["retailer_id"];
            isOneToOne: false;
            referencedRelation: "retailers";
            referencedColumns: ["id"];
          },
        ];
      };
      prices: {
        Row: {
          id: string;
          link_id: string;
          price: number;
          in_stock: boolean;
          scraped_at: string;
        };
        // prices er append-only: kun Insert bruges i praksis, Update findes
        // for at opfylde Supabase-typernes struktur, men bør ikke kaldes.
        Insert: {
          id?: string;
          link_id: string;
          price: number;
          in_stock?: boolean;
          scraped_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["prices"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "prices_link_id_fkey";
            columns: ["link_id"];
            isOneToOne: false;
            referencedRelation: "product_retailer_links";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      latest_prices: {
        Row: {
          id: string;
          link_id: string;
          price: number;
          in_stock: boolean;
          scraped_at: string;
        };
        Relationships: [];
      };
      product_lowest_prices: {
        Row: {
          product_id: string;
          lowest_price: number;
          retailer_count: number;
          highest_price: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
