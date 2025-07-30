# Inbox Infrastructure Documentation

## Overview

The inbox infrastructure provides a comprehensive messaging system for AI coaches to communicate with users. It supports rich messages with attachments, priority levels, categorization, and integration with the graph database for linking messages to coaching sessions and goals.

## Database Schema

### Tables

1. **inbox_messages** - Main table for storing messages
   - Links to users, coaching sessions, and goals
   - Supports status tracking, pinning, starring, and expiration
   - Full-text search capabilities via tags and content

2. **message_attachments** - Stores multimedia content
   - Supports various attachment types (image, video, audio, document, link)
   - Can use Supabase storage or external URLs
   - Tracks processing status for media files

3. **message_read_receipts** - Detailed read tracking
   - Records read time, duration, and interaction count
   - Stores device information for analytics

### Key Features

- **Row Level Security (RLS)**: Users can only access their own messages
- **Soft delete**: Messages are archived rather than permanently deleted
- **Temporal support**: Messages can have expiration dates
- **Graph integration**: Messages link to coaching sessions and goals

## API Endpoints

### Message Management

```typescript
// Get messages with filtering and pagination
GET /api/inbox/messages?status=unread&category=reminder&limit=20&offset=0

// Create a new message
POST /api/inbox/messages
Body: CreateMessageRequest

// Get specific message
GET /api/inbox/messages/[messageId]

// Update message (status, pin, star, tags)
PATCH /api/inbox/messages/[messageId]
Body: MessageUpdateRequest

// Archive message
DELETE /api/inbox/messages/[messageId]
```

### Read Status

```typescript
// Mark message as read
POST /api/inbox/messages/[messageId]/read
Body: { readDurationSeconds?: number, deviceInfo?: object }

// Get unread count
GET /api/inbox/unread-count
```

### Message Actions

```typescript
// Toggle pin status
POST /api/inbox/messages/[messageId]/pin

// Bulk actions
POST /api/inbox/bulk-actions
Body: { action: 'mark_read' | 'archive' | ..., messageIds: string[] }
```

### Attachments

```typescript
// Get attachment with signed URL
GET /api/inbox/messages/[messageId]/attachments/[attachmentId]

// Delete attachment
DELETE /api/inbox/messages/[messageId]/attachments/[attachmentId]
```

## Usage Examples

### Creating Messages from AI Coaches

```typescript
import { InboxService } from '@/services/inbox-service'

// After a coaching session
await InboxService.createSessionSummaryMessage({
  userId: user.id,
  sessionNodeId: session.id,
  goalNodeId: goal.id,
  coachName: 'Maya',
  coachAgentId: 'maya-agent-id',
  keyInsights: [
    'You showed great progress in confidence',
    'Your interview practice is paying off'
  ],
  actionItems: [
    'Practice STAR method for behavioral questions',
    'Research the company culture before interview'
  ]
})

// Goal achievement
await InboxService.createGoalAchievementMessage({
  userId: user.id,
  goalNodeId: goal.id,
  goalTitle: 'Land a Product Manager Role',
  coachName: 'Maya',
  coachAgentId: 'maya-agent-id'
})
```

### Frontend Integration

```typescript
// Fetch messages
const response = await fetch('/api/inbox/messages?status=unread')
const { messages, unreadCount, pagination } = await response.json()

// Mark as read
await fetch(`/api/inbox/messages/${messageId}/read`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ readDurationSeconds: 30 })
})

// Toggle pin
await fetch(`/api/inbox/messages/${messageId}/pin`, {
  method: 'POST'
})
```

## Message Categories

- **goal_update**: Progress updates on user goals
- **reminder**: Time-sensitive reminders
- **motivation**: Daily motivational messages
- **achievement**: Goal completions and milestones
- **feedback**: Session summaries and feedback
- **tip**: Learning resources and tips

## Priority Levels

- **urgent**: Immediate attention required (red)
- **high**: Important messages (orange)
- **normal**: Regular updates (blue)
- **low**: FYI messages (gray)

## Security Considerations

1. All endpoints require authentication
2. RLS policies ensure users only see their own messages
3. Service role needed for AI coaches to create messages
4. Attachment URLs are signed with expiration times

## Performance Optimizations

1. Indexed columns for fast queries:
   - user_id, status, priority, created_at
   - session_node_id, goal_node_id
   - Full-text search on tags

2. Summary view for efficient listing
3. Pagination support for large message volumes
4. Archived messages excluded from default queries

## Future Enhancements

1. Real-time notifications via Supabase subscriptions
2. Message templates for common coach communications
3. Rich text editor support with markdown
4. Voice message attachments
5. Message threading for conversations
6. Analytics dashboard for message engagement