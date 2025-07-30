import { InboxMessage, MessagePriority, MessageStatus } from '@/types/inbox'

// Priority color mapping
export const getPriorityColor = (priority: MessagePriority): string => {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 bg-red-50'
    case 'high':
      return 'text-orange-600 bg-orange-50'
    case 'normal':
      return 'text-blue-600 bg-blue-50'
    case 'low':
      return 'text-gray-600 bg-gray-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

// Priority icon mapping
export const getPriorityIcon = (priority: MessagePriority): string => {
  switch (priority) {
    case 'urgent':
      return '🚨'
    case 'high':
      return '⚠️'
    case 'normal':
      return 'ℹ️'
    case 'low':
      return '💭'
    default:
      return '💬'
  }
}

// Category icon mapping
export const getCategoryIcon = (category?: string): string => {
  switch (category) {
    case 'goal_update':
      return '🎯'
    case 'reminder':
      return '⏰'
    case 'motivation':
      return '💪'
    case 'achievement':
      return '🏆'
    case 'feedback':
      return '💬'
    case 'tip':
      return '💡'
    default:
      return '📧'
  }
}

// Format relative time
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date()
  const messageDate = new Date(date)
  const diffMs = now.getTime() - messageDate.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return 'just now'
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return messageDate.toLocaleDateString()
  }
}

// Group messages by date
export const groupMessagesByDate = (messages: InboxMessage[]): Record<string, InboxMessage[]> => {
  const groups: Record<string, InboxMessage[]> = {}
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  messages.forEach(message => {
    const messageDate = new Date(message.created_at)
    let groupKey: string

    if (messageDate.toDateString() === today.toDateString()) {
      groupKey = 'Today'
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday'
    } else if (messageDate > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      groupKey = 'This Week'
    } else if (messageDate > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      groupKey = 'This Month'
    } else {
      groupKey = 'Older'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(message)
  })

  return groups
}

// Filter messages based on search query
export const filterMessages = (messages: InboxMessage[], query: string): InboxMessage[] => {
  if (!query || query.trim() === '') {
    return messages
  }

  const searchTerms = query.toLowerCase().split(' ')
  
  return messages.filter(message => {
    const searchableText = `${message.subject} ${message.content} ${message.sender_name} ${message.category || ''} ${message.tags.join(' ')}`.toLowerCase()
    
    return searchTerms.every(term => searchableText.includes(term))
  })
}

// Get attachment icon based on type
export const getAttachmentIcon = (mimeType?: string): string => {
  if (!mimeType) return '📎'
  
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎥'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('document') || mimeType.includes('msword')) return '📃'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️'
  
  return '📎'
}

// Format file size
export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown size'
  
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

// Check if message is expired
export const isMessageExpired = (expiresAt?: string): boolean => {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

// Sort messages by priority and date
export const sortMessages = (messages: InboxMessage[]): InboxMessage[] => {
  const priorityOrder: Record<MessagePriority, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3
  }

  return [...messages].sort((a, b) => {
    // Pinned messages first
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1
    }

    // Then by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) {
      return priorityDiff
    }

    // Finally by date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}