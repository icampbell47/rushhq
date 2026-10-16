export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      brothers: {
        Row: Record<string, unknown> & {
          rollbook_number: number;
          first_name: string;
          last_name: string;
          email: string | null;
          phone_number: string | null;
        };
        Insert: Record<string, unknown> & {
          rollbook_number: number;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone_number?: string | null;
        };
        Update: Record<string, unknown> & {
          rollbook_number?: number;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone_number?: string | null;
        };
        Relationships: [];
      };
      pnms: {
        Row: Record<string, unknown> & {
          id: string;
          first_name: string;
          last_name: string;
          hometown: string | null;
          year_of_school: "Freshman" | "Sophomore" | "Junior" | "Senior" | null;
          email: string | null;
          instagram_handle: string | null;
          major: string | null;
          phone_number: string | null;
          status: Database["public"]["Enums"]["pnm_status"];
          created_at: string | null;
          first_name_key: string | null;
          last_name_key: string | null;
        };
        Insert: Record<string, unknown> & {
          id?: string;
          first_name: string;
          last_name: string;
          hometown?: string | null;
          year_of_school?: "Freshman" | "Sophomore" | "Junior" | "Senior" | null;
          email?: string | null;
          instagram_handle?: string | null;
          major?: string | null;
          phone_number?: string | null;
          status?: Database["public"]["Enums"]["pnm_status"];
          created_at?: string | null;
          first_name_key?: string | null;
          last_name_key?: string | null;
        };
        Update: Record<string, unknown> & {
          id?: string;
          first_name?: string;
          last_name?: string;
          hometown?: string | null;
          year_of_school?: "Freshman" | "Sophomore" | "Junior" | "Senior" | null;
          email?: string | null;
          instagram_handle?: string | null;
          major?: string | null;
          phone_number?: string | null;
          status?: Database["public"]["Enums"]["pnm_status"];
          created_at?: string | null;
          first_name_key?: string | null;
          last_name_key?: string | null;
        };
        Relationships: [];
      };
      pnm_checkins: {
        Row: Record<string, unknown> & {
          id: string;
          pnm_id: string;
          checked_in_at: string;
          rush_date: string;
        };
        Insert: Record<string, unknown> & {
          id?: string;
          pnm_id: string;
          checked_in_at?: string;
          rush_date?: string;
        };
        Update: Record<string, unknown> & {
          id?: string;
          pnm_id?: string;
          checked_in_at?: string;
          rush_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pnm_checkins_pnm_id_fkey";
            columns: ["pnm_id"];
            isOneToOne: false;
            referencedRelation: "pnms";
            referencedColumns: ["id"];
          }
        ];
      };
      ratings: {
        Row: Record<string, unknown> & {
          id: string;
          pnm_id: string;
          brother_rollbook_number: number | null;
          submitted_by_rollbook: number | null;
          submitted_at: string | null;
          humor_score: number | null;
          sociability_score: number | null;
          genuineness_score: number | null;
          passion_score: number | null;
          bid_vote: boolean | null;
          comments: string | null;
          interests_activities: string | null;
        };
        Insert: Record<string, unknown> & {
          id?: string;
          pnm_id: string;
          brother_rollbook_number?: number | null;
          submitted_by_rollbook?: number | null;
          submitted_at?: string | null;
          humor_score?: number | null;
          sociability_score?: number | null;
          genuineness_score?: number | null;
          passion_score?: number | null;
          bid_vote?: boolean | null;
          comments?: string | null;
          interests_activities?: string | null;
        };
        Update: Record<string, unknown> & {
          id?: string;
          pnm_id?: string;
          brother_rollbook_number?: number | null;
          submitted_by_rollbook?: number | null;
          submitted_at?: string | null;
          humor_score?: number | null;
          sociability_score?: number | null;
          genuineness_score?: number | null;
          passion_score?: number | null;
          bid_vote?: boolean | null;
          comments?: string | null;
          interests_activities?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_brother_rollbook_number_fkey";
            columns: ["brother_rollbook_number"];
            isOneToOne: false;
            referencedRelation: "brothers";
            referencedColumns: ["rollbook_number"];
          },
          {
            foreignKeyName: "ratings_pnm_id_fkey";
            columns: ["pnm_id"];
            isOneToOne: false;
            referencedRelation: "pnms";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_in_pnm: {
        Args: {
          p_first_name: string;
          p_last_name: string;
          p_hometown: string | null;
          p_year_of_school: "Freshman" | "Sophomore" | "Junior" | "Senior";
          p_major: string;
          p_instagram_handle: string;
          p_phone_number: string | null;
          p_first_name_key: string;
          p_last_name_key: string;
          p_rush_date: string;
        };
        Returns: Database["public"]["Tables"]["pnms"]["Row"];
      };
    };
    Enums: {
      pnm_status:
        | "Dumpster Toured"
        | "Getting Cold"
        | "Neutral"
        | "Getting Hot"
        | "Bid Ready"
        | "Bidded"
        | "Pledge"
        | "Declined";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type PnmStatus = Database["public"]["Enums"]["pnm_status"];
export type Pnm = Database["public"]["Tables"]["pnms"]["Row"];
export type PnmCheckIn = Database["public"]["Tables"]["pnm_checkins"]["Row"];
export type Brother = Database["public"]["Tables"]["brothers"]["Row"];
export type Rating = Database["public"]["Tables"]["ratings"]["Row"];
