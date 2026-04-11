export interface Message {
  role: 'user' | 'ai' | 'assistant';
  content: string;
  created_at?: string;
}

export interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  type?: string;
  isDefault?: boolean;
  isGuestModel?: boolean;
  isFetched?: boolean;
}

export interface ApiKeyRecord {
  id: string;
  provider: string;
  key_name: string;
  is_active: boolean;
  api_key: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
  is_archived?: boolean;
}

export interface UserProfile {
  nickname?: string;
}
