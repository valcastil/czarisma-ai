export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          username: string;
          email: string;
          phone: string | null;
          avatar: string | null;
          date_of_birth: number | null;
          gender: string | null;
          city: string;
          country: string;
          is_verified: boolean;
          two_factor_enabled: boolean;
          bio: string | null;
          interests: string[];
          occupation: string | null;
          website: string | null;
          facebook: string | null;
          instagram: string | null;
          whatsapp: string | null;
          tiktok: string | null;
          join_date: number;
          total_entries: number;
          streak: number;
          top_charisma: string;
          preferred_emotions: string[];
          notifications_email: boolean;
          notifications_push: boolean;
          notifications_daily_reminders: boolean;
          notifications_weekly_reports: boolean;
          privacy_profile_visibility: string;
          privacy_show_email: boolean;
          privacy_show_phone: boolean;
          privacy_show_location: boolean;
          privacy_show_birth_date: boolean;
          preferences_language: string;
          preferences_theme: string;
          is_online: boolean;
          last_seen: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      charisma_entries: {
        Row: {
          id: string;
          user_id: string;
          major_charisma: string;
          sub_charisma: string | null;
          notes: string | null;
          timestamp: number;
          date: string;
          time: string;
          charisma_emoji: string;
          emotion_emojis: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['charisma_entries']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['charisma_entries']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          timestamp: number;
          date: string;
          time: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          participant_id: string;
          last_message_id: string | null;
          unread_count: number;
          updated_at: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
    };
  };
};