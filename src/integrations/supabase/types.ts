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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_email: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_email: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      credits_balance: {
        Row: {
          created_at: string
          credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          annotations: Json | null
          clarity_of_thought_score: number | null
          created_at: string
          current_awareness_score: number | null
          detailed_feedback: Json | null
          extracurricular_score: number | null
          feedback_content: string
          fluency_coherence_score: number | null
          grammatical_range_score: number | null
          id: string
          interview_category: string | null
          interview_session_id: string | null
          interview_type: string | null
          lexical_resource_score: number | null
          logical_deduction_score: number | null
          mathematical_logic_score: number | null
          overall_improvement_feedback: string | null
          pattern_recognition_score: number | null
          personal_insight_score: number | null
          pronunciation_score: number | null
          rating: number | null
          reasoning_score: number | null
          scores: Json | null
          scoring_system: string | null
          session_reference: string | null
          total_score: number | null
          transcription: string | null
          user_id: string
        }
        Insert: {
          annotations?: Json | null
          clarity_of_thought_score?: number | null
          created_at?: string
          current_awareness_score?: number | null
          detailed_feedback?: Json | null
          extracurricular_score?: number | null
          feedback_content: string
          fluency_coherence_score?: number | null
          grammatical_range_score?: number | null
          id?: string
          interview_category?: string | null
          interview_session_id?: string | null
          interview_type?: string | null
          lexical_resource_score?: number | null
          logical_deduction_score?: number | null
          mathematical_logic_score?: number | null
          overall_improvement_feedback?: string | null
          pattern_recognition_score?: number | null
          personal_insight_score?: number | null
          pronunciation_score?: number | null
          rating?: number | null
          reasoning_score?: number | null
          scores?: Json | null
          scoring_system?: string | null
          session_reference?: string | null
          total_score?: number | null
          transcription?: string | null
          user_id: string
        }
        Update: {
          annotations?: Json | null
          clarity_of_thought_score?: number | null
          created_at?: string
          current_awareness_score?: number | null
          detailed_feedback?: Json | null
          extracurricular_score?: number | null
          feedback_content?: string
          fluency_coherence_score?: number | null
          grammatical_range_score?: number | null
          id?: string
          interview_category?: string | null
          interview_session_id?: string | null
          interview_type?: string | null
          lexical_resource_score?: number | null
          logical_deduction_score?: number | null
          mathematical_logic_score?: number | null
          overall_improvement_feedback?: string | null
          pattern_recognition_score?: number | null
          personal_insight_score?: number | null
          pronunciation_score?: number | null
          rating?: number | null
          reasoning_score?: number | null
          scores?: Json | null
          scoring_system?: string | null
          session_reference?: string | null
          total_score?: number | null
          transcription?: string | null
          user_id?: string
        }
        Relationships: []
      }
      interview_logs: {
        Row: {
          id: string
          log_level: string
          log_type: string
          message: string
          metadata: Json | null
          session_id: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          log_level?: string
          log_type: string
          message: string
          metadata?: Json | null
          session_id?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          log_level?: string
          log_type?: string
          message?: string
          metadata?: Json | null
          session_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          anam_session_token_hash: string | null
          created_at: string
          ended_at: string | null
          error_logs: Json | null
          id: string
          interview_type: string
          last_activity_at: string
          session_metadata: Json | null
          session_reference: string
          started_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anam_session_token_hash?: string | null
          created_at?: string
          ended_at?: string | null
          error_logs?: Json | null
          id?: string
          interview_type: string
          last_activity_at?: string
          session_metadata?: Json | null
          session_reference: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anam_session_token_hash?: string | null
          created_at?: string
          ended_at?: string | null
          error_logs?: Json | null
          id?: string
          interview_type?: string
          last_activity_at?: string
          session_metadata?: Json | null
          session_reference?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          credits_purchased: number
          currency: string
          id: string
          metadata: Json | null
          status: string
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits_purchased?: number
          currency?: string
          id?: string
          metadata?: Json | null
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits_purchased?: number
          currency?: string
          id?: string
          metadata?: Json | null
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          interview_date: string | null
          preferred_interview_type: string | null
          school_interviews: Json
          schools: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          interview_date?: string | null
          preferred_interview_type?: string | null
          school_interviews?: Json
          schools?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          interview_date?: string | null
          preferred_interview_type?: string | null
          school_interviews?: Json
          schools?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_credit: { Args: never; Returns: boolean }
      delete_user: { Args: never; Returns: undefined }
      generate_session_reference: { Args: never; Returns: string }
      get_current_admin_email: { Args: never; Returns: string }
      is_current_user_admin: { Args: never; Returns: boolean }
      verify_admin_access_with_logging: { Args: never; Returns: boolean }
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
    Enums: {},
  },
} as const
