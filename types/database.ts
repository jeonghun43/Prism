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
      users: {
        Row: {
          id: string
          nickname: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nickname: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nickname?: string
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          question_text: string
          options: Json
          category: string | null
          created_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          question_text: string
          options: Json
          category?: string | null
          created_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          question_text?: string
          options?: Json
          category?: string | null
          created_at?: string
          is_active?: boolean
        }
      }
      responses: {
        Row: {
          id: string
          user_id: string
          question_id: string
          selected_option_id: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          selected_option_id: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          selected_option_id?: number
          created_at?: string
        }
      }
      report_locks: {
        Row: {
          user_id: string
          is_locked: boolean
          minimum_responses: number
          created_at: string
          unlocked_at: string | null
        }
        Insert: {
          user_id: string
          is_locked?: boolean
          minimum_responses?: number
          created_at?: string
          unlocked_at?: string | null
        }
        Update: {
          user_id?: string
          is_locked?: boolean
          minimum_responses?: number
          created_at?: string
          unlocked_at?: string | null
        }
      }
    }
  }
}

