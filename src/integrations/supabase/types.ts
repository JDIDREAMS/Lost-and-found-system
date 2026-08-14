export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      claims: {
        Row: {
          claimant_id: string;
          created_at: string;
          id: string;
          item_id: string;
          message: string;
          status: Database["public"]["Enums"]["claim_status"];
        };
        Insert: {
          claimant_id: string;
          created_at?: string;
          id?: string;
          item_id: string;
          message: string;
          status?: Database["public"]["Enums"]["claim_status"];
        };
        Update: {
          claimant_id?: string;
          created_at?: string;
          id?: string;
          item_id?: string;
          message?: string;
          status?: Database["public"]["Enums"]["claim_status"];
        };
        Relationships: [
          {
            foreignKeyName: "claims_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          bumped_at?: string | null;
          campus_zone?: string | null;
          category: string;
          contact_info: string | null;
          created_at: string;
          date_occurred: string;
          description: string;
          expires_at?: string | null;
          id: string;
          image_url: string | null;
          item_type: Database["public"]["Enums"]["item_type"];
          location: string;
          ocr_text?: string | null;
          posted_by: string | null;
          poster_name: string;
          sensitive_details?: string | null;
          status: Database["public"]["Enums"]["item_status"];
          title: string;
          updated_at: string;
          video_url?: string | null;
        };
        Insert: {
          bumped_at?: string | null;
          campus_zone?: string | null;
          category?: string;
          contact_info?: string | null;
          created_at?: string;
          date_occurred?: string;
          description?: string;
          expires_at?: string | null;
          id?: string;
          image_url?: string | null;
          item_type: Database["public"]["Enums"]["item_type"];
          location?: string;
          ocr_text?: string | null;
          posted_by?: string | null;
          poster_name?: string;
          sensitive_details?: string | null;
          status?: Database["public"]["Enums"]["item_status"];
          title: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          bumped_at?: string | null;
          campus_zone?: string | null;
          category?: string;
          contact_info?: string | null;
          created_at?: string;
          date_occurred?: string;
          description?: string;
          expires_at?: string | null;
          id?: string;
          image_url?: string | null;
          item_type?: Database["public"]["Enums"]["item_type"];
          location?: string;
          ocr_text?: string | null;
          posted_by?: string | null;
          poster_name?: string;
          sensitive_details?: string | null;
          status?: Database["public"]["Enums"]["item_status"];
          title?: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          claim_id: string;
          created_at: string;
          id: string;
          is_read: boolean;
          sender_id: string;
          text: string;
        };
        Insert: {
          claim_id: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          sender_id: string;
          text: string;
        };
        Update: {
          claim_id?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          sender_id?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "claims";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          is_read: boolean;
          link: string | null;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          text?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          phone: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id: string;
          phone?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_claim_participant: {
        Args: { _claim_id: string; _user_id: string };
        Returns: boolean;
      };
      item_owner: { Args: { _item_id: string }; Returns: string };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
      claim_status: "pending" | "approved" | "rejected";
      item_status: "open" | "claimed" | "resolved";
      item_type: "lost" | "found";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      claim_status: ["pending", "approved", "rejected"],
      item_status: ["open", "claimed", "resolved"],
      item_type: ["lost", "found"],
    },
  },
} as const;
