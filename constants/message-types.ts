export interface Attachment {
  type: 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'charisma_entry';
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  // Location-only fields
  latitude?: number;
  longitude?: number;
  locationLabel?: string;  // reverse-geocoded address or place name
  liveShareId?: string;    // references live_locations.id when this is a live share
  liveExpiresAt?: number;  // epoch ms; when the live share ends
}

export interface ForwardMetadata {
  isForwarded: boolean;
  forwardedFromUserId?: string;
  forwardedFromUsername?: string;
  forwardedFromName?: string;
  forwardedFromMessageId?: string;
  forwardCount: number;
  forwardChain: Array<{
    userId: string;
    username: string;
    name: string;
    timestamp: number;
  }>;
}

export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  receiverId: string;
  receiverUsername: string;
  receiverName: string;
  content: string;
  timestamp: number;
  date: string;
  time: string;
  isRead: boolean;
  deliveryStatus?: 'sent' | 'delivered' | 'read';
  isFromCurrentUser: boolean;
  reactions?: string[];
  attachment?: Attachment;
  forwardMetadata?: ForwardMetadata;
  isForwarded?: boolean;
  forwardedFrom?: string;
  originalMessageId?: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantUsername: string;
  participantName: string;
  participantIsOnline?: boolean;
  participantLastSeen?: number;
  participantAvatarUrl?: string;
  lastMessage: Message;
  unreadCount: number;
  updatedAt: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  isOnline?: boolean;
  lastSeen?: number;
  avatarUrl?: string;
  handleAt?: string | null;
  handleHash?: string | null;
}

export interface ForwardRecipient {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
}
