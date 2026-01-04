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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ambulances: {
        Row: {
          active_token_id: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string | null
          driver_id: string | null
          emergency_status: Database["public"]["Enums"]["emergency_status"]
          heading: number | null
          id: string
          last_updated: string
          route_direction: Database["public"]["Enums"]["route_direction"] | null
          speed: number | null
          vehicle_number: string
        }
        Insert: {
          active_token_id?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          driver_id?: string | null
          emergency_status?: Database["public"]["Enums"]["emergency_status"]
          heading?: number | null
          id?: string
          last_updated?: string
          route_direction?:
            | Database["public"]["Enums"]["route_direction"]
            | null
          speed?: number | null
          vehicle_number: string
        }
        Update: {
          active_token_id?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          driver_id?: string | null
          emergency_status?: Database["public"]["Enums"]["emergency_status"]
          heading?: number | null
          id?: string
          last_updated?: string
          route_direction?:
            | Database["public"]["Enums"]["route_direction"]
            | null
          speed?: number | null
          vehicle_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulances_active_token_id_fkey"
            columns: ["active_token_id"]
            isOneToOne: false
            referencedRelation: "emergency_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_tokens: {
        Row: {
          ambulance_id: string
          ambulance_origin_lat: number | null
          ambulance_origin_lng: number | null
          arrived_at_patient_at: string | null
          assigned_at: string | null
          completed_at: string | null
          created_at: string
          decline_reason: string | null
          hospital_id: string | null
          hospital_lat: number | null
          hospital_lng: number | null
          hospital_name: string | null
          id: string
          pickup_address: string | null
          pickup_lat: number
          pickup_lng: number
          route_distance_meters: number | null
          route_duration_seconds: number | null
          route_to_hospital: Json | null
          route_to_hospital_distance_meters: number | null
          route_to_hospital_duration_seconds: number | null
          route_to_patient: Json | null
          route_to_patient_distance_meters: number | null
          route_to_patient_duration_seconds: number | null
          route_type: string | null
          selected_route: Json | null
          started_at: string | null
          status: string
          token_code: string
        }
        Insert: {
          ambulance_id: string
          ambulance_origin_lat?: number | null
          ambulance_origin_lng?: number | null
          arrived_at_patient_at?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          decline_reason?: string | null
          hospital_id?: string | null
          hospital_lat?: number | null
          hospital_lng?: number | null
          hospital_name?: string | null
          id?: string
          pickup_address?: string | null
          pickup_lat: number
          pickup_lng: number
          route_distance_meters?: number | null
          route_duration_seconds?: number | null
          route_to_hospital?: Json | null
          route_to_hospital_distance_meters?: number | null
          route_to_hospital_duration_seconds?: number | null
          route_to_patient?: Json | null
          route_to_patient_distance_meters?: number | null
          route_to_patient_duration_seconds?: number | null
          route_type?: string | null
          selected_route?: Json | null
          started_at?: string | null
          status?: string
          token_code?: string
        }
        Update: {
          ambulance_id?: string
          ambulance_origin_lat?: number | null
          ambulance_origin_lng?: number | null
          arrived_at_patient_at?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          decline_reason?: string | null
          hospital_id?: string | null
          hospital_lat?: number | null
          hospital_lng?: number | null
          hospital_name?: string | null
          id?: string
          pickup_address?: string | null
          pickup_lat?: number
          pickup_lng?: number
          route_distance_meters?: number | null
          route_duration_seconds?: number | null
          route_to_hospital?: Json | null
          route_to_hospital_distance_meters?: number | null
          route_to_hospital_duration_seconds?: number | null
          route_to_patient?: Json | null
          route_to_patient_distance_meters?: number | null
          route_to_patient_duration_seconds?: number | null
          route_type?: string | null
          selected_route?: Json | null
          started_at?: string | null
          status?: string
          token_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_tokens_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_tokens_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ambulance_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_approved: boolean
          organization_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          ambulance_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_approved?: boolean
          organization_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          ambulance_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
          organization_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_activations: {
        Row: {
          activated_at: string
          activation_type: string
          ambulance_id: string
          distance_meters: number
          id: string
          signal_id: string
        }
        Insert: {
          activated_at?: string
          activation_type: string
          ambulance_id: string
          distance_meters: number
          id?: string
          signal_id: string
        }
        Update: {
          activated_at?: string
          activation_type?: string
          ambulance_id?: string
          distance_meters?: number
          id?: string
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_activations_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_activations_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "traffic_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_signals: {
        Row: {
          activated_by: string | null
          created_at: string
          current_status: Database["public"]["Enums"]["signal_status"]
          direction_ew: string
          direction_ns: string
          direction_sn: string
          direction_we: string
          id: string
          last_updated: string
          location_lat: number
          location_lng: number
          priority_direction:
            | Database["public"]["Enums"]["route_direction"]
            | null
          signal_name: string
        }
        Insert: {
          activated_by?: string | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["signal_status"]
          direction_ew?: string
          direction_ns?: string
          direction_sn?: string
          direction_we?: string
          id?: string
          last_updated?: string
          location_lat: number
          location_lng: number
          priority_direction?:
            | Database["public"]["Enums"]["route_direction"]
            | null
          signal_name: string
        }
        Update: {
          activated_by?: string | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["signal_status"]
          direction_ew?: string
          direction_ns?: string
          direction_sn?: string
          direction_we?: string
          id?: string
          last_updated?: string
          location_lat?: number
          location_lng?: number
          priority_direction?:
            | Database["public"]["Enums"]["route_direction"]
            | null
          signal_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_signals_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_ambulance_driver: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      emergency_status: "inactive" | "active" | "responding"
      route_direction: "N_S" | "S_N" | "E_W" | "W_E"
      signal_status: "normal" | "prepare" | "priority"
      user_role: "ambulance" | "hospital" | "admin"
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
  public: {
    Enums: {
      emergency_status: ["inactive", "active", "responding"],
      route_direction: ["N_S", "S_N", "E_W", "W_E"],
      signal_status: ["normal", "prepare", "priority"],
      user_role: ["ambulance", "hospital", "admin"],
    },
  },
} as const
