// Inbox message types
export type MessageStatus = 'unread' | 'read' | 'archived'
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent'
export type AttachmentType = 'image' | 'video' | 'audio' | 'document' | 'link'

export interface InboxMessage {
  id: string
  user_id: string
  subject: string
  content: string
  preview?: string
  sender_agent_id: string
  sender_name: string
  sender_avatar_url?: string
  category?: string
  priority: MessagePriority
  tags: string[]
  status: MessageStatus
  is_pinned: boolean
  is_starred: boolean
  session_node_id?: string
  goal_node_id?: string
  metadata?: Record<string, any>
  expires_at?: string
  created_at: string
  updated_at: string
  read_at?: string
  archived_at?: string
}

export interface MessageAttachment {
  id: string
  message_id: string
  type: AttachmentType
  name: string
  description?: string
  storage_path?: string
  url?: string
  mime_type?: string
  file_size_bytes?: number
  metadata?: Record<string, any>
  is_processed: boolean
  processed_at?: string
  created_at: string
}

export interface MessageReadReceipt {
  id: string
  message_id: string
  user_id: string
  read_at: string
  read_duration_seconds?: number
  interaction_count: number
  device_info?: Record<string, any>
}

export interface InboxSummary {
  user_id: string
  message_id: string
  subject: string
  preview?: string
  sender_name: string
  sender_avatar_url?: string
  category?: string
  priority: MessagePriority
  status: MessageStatus
  is_pinned: boolean
  is_starred: boolean
  created_at: string
  read_at?: string
  attachment_count: number
  session_label?: string
  goal_label?: string
}

// API request/response types
export interface CreateMessageRequest {
  user_id?: string
  subject: string
  content: string
  sender_agent_id: string
  sender_name: string
  sender_avatar_url?: string
  category?: string
  priority?: MessagePriority
  tags?: string[]
  session_node_id?: string
  goal_node_id?: string
  metadata?: Record<string, any>
  expires_at?: string
  attachments?: CreateAttachmentRequest[]
}

export interface CreateAttachmentRequest {
  type: AttachmentType
  name: string
  description?: string
  storage_path?: string
  url?: string
  mime_type?: string
  file_size_bytes?: number
  metadata?: Record<string, any>
}

export interface MessageListRequest {
  status?: MessageStatus
  category?: string
  priority?: MessagePriority
  pinned?: boolean
  goalId?: string
  sessionId?: string
  limit?: number
  offset?: number
}

export interface MessageListResponse {
  messages: InboxSummary[]
  unreadCount: number
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface MessageUpdateRequest {
  status?: MessageStatus
  is_pinned?: boolean
  is_starred?: boolean
  tags?: string[]
}

export interface MarkAsReadRequest {
  readDurationSeconds?: number
  deviceInfo?: Record<string, any>
}

export interface BulkActionRequest {
  action: 'mark_read' | 'mark_unread' | 'archive' | 'unarchive' | 'delete'
  messageIds: string[]
}

// Helper types for frontend
export interface InboxFilters {
  status?: MessageStatus
  category?: string
  priority?: MessagePriority
  pinned?: boolean
  search?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface InboxStats {
  total: number
  unread: number
  pinned: number
  byCategory: Record<string, number>
  byPriority: Record<MessagePriority, number>
}