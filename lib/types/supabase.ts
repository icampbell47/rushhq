export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brothers: {
        Row: {
          email: string | null
          first_name: string
          last_name: string
          phone_number: string | null
          rollbook_number: number
        }
        Insert: {
          email?: string | null
          first_name: string
          last_name: string
          phone_number?: string | null
          rollbook_number: number
        }
        Update: {
          email?: string | null
          first_name?: string
          last_name?: string
          phone_number?: string | null
          rollbook_number?: number
        }
        Relationships: []
      }
      pnm_checkins: {
        Row: {
          checked_in_at: string
          id: string
          pnm_id: string
          rush_date: string
        }
        Insert: {
          checked_in_at?: string
          id?: string
          pnm_id: string
          rush_date?: string
        }
        Update: {
          checked_in_at?: string
          id?: string
          pnm_id?: string
          rush_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pnm_checkins_pnm_id_fkey"
            columns: ["pnm_id"]
            isOneToOne: false
            referencedRelation: "pnms"
            referencedColumns: ["id"]
          },
        ]
      }
      pnms: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string
          first_name_key: string | null
          hometown: string | null
          id: string
          instagram_handle: string | null
          last_name: string
          last_name_key: string | null
          major: string | null
          phone_number: string | null
          status: Database["public"]["Enums"]["pnm_status"]
          year_of_school: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name: string
          first_name_key?: string | null
          hometown?: string | null
          id?: string
          instagram_handle?: string | null
          last_name: string
          last_name_key?: string | null
          major?: string | null
          phone_number?: string | null
          status?: Database["public"]["Enums"]["pnm_status"]
          year_of_school?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string
          first_name_key?: string | null
          hometown?: string | null
          id?: string
          instagram_handle?: string | null
          last_name?: string
          last_name_key?: string | null
          major?: string | null
          phone_number?: string | null
          status?: Database["public"]["Enums"]["pnm_status"]
          year_of_school?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          bid_vote: boolean | null
          brother_rollbook_number: number | null
          comments: string | null
          genuineness_score: number | null
          humor_score: number | null
          id: string
          interests_activities: string | null
          passion_score: number | null
          pnm_id: string
          sociability_score: number | null
          submitted_at: string | null
          submitted_by_rollbook: string | null
        }
        Insert: {
          bid_vote?: boolean | null
          brother_rollbook_number?: number | null
          comments?: string | null
          genuineness_score?: number | null
          humor_score?: number | null
          id?: string
          interests_activities?: string | null
          passion_score?: number | null
          pnm_id: string
          sociability_score?: number | null
          submitted_at?: string | null
          submitted_by_rollbook?: string | null
        }
        Update: {
          bid_vote?: boolean | null
          brother_rollbook_number?: number | null
          comments?: string | null
          genuineness_score?: number | null
          humor_score?: number | null
          id?: string
          interests_activities?: string | null
          passion_score?: number | null
          pnm_id?: string
          sociability_score?: number | null
          submitted_at?: string | null
          submitted_by_rollbook?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_brother_rollbook_number_fkey"
            columns: ["brother_rollbook_number"]
            isOneToOne: false
            referencedRelation: "brothers"
            referencedColumns: ["rollbook_number"]
          },
          {
            foreignKeyName: "ratings_pnm_id_fkey"
            columns: ["pnm_id"]
            isOneToOne: false
            referencedRelation: "pnms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_in_pnm: {
        Args: {
          p_first_name: string
          p_first_name_key: string
          p_hometown?: string
          p_instagram_handle?: string
          p_last_name: string
          p_last_name_key: string
          p_major: string
          p_phone_number?: string
          p_rush_date: string
          p_year_of_school: string
        }
        Returns: {
          created_at: string | null
          email: string | null
          first_name: string
          first_name_key: string | null
          hometown: string | null
          id: string
          instagram_handle: string | null
          last_name: string
          last_name_key: string | null
          major: string | null
          phone_number: string | null
          status: Database["public"]["Enums"]["pnm_status"]
          year_of_school: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pnms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      normalize_pnm_identity_part: { Args: { input: string }; Returns: string }
    }
    Enums: {
      pnm_status:
        | "Released"
        | "Getting Cold"
        | "Neutral"
        | "Getting Hot"
        | "Bid Ready"
        | "Bidded"
        | "Pledge"
        | "Declined"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      pnm_status: [
        "Released",
        "Getting Cold",
        "Neutral",
        "Getting Hot",
        "Bid Ready",
        "Bidded",
        "Pledge",
        "Declined",
      ],
    },
  },
} as const

