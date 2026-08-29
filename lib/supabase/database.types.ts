// Håndskrevne typer der matcher supabase/migrations/20260829104737_init_schema.sql.
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
      };
      products: {
        Row: {
          id: string;
          name: string;
          brand: string | null;
          volume_ml: number | null;
          abv: number | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand?: string | null;
          volume_ml?: number | null;
          abv?: number | null;
          category?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
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
      };
    };
  };
}
