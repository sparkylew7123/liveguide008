# Authentication Flow Documentation

## Overview
LiveGuide uses a hybrid authentication system that supports both authenticated and anonymous users, allowing users to interact with the platform without requiring immediate registration.

## Authentication Architecture

### 1. User Types

#### **Authenticated Users**
- Have a registered account with email/password or OAuth
- Full `auth.users` record in Supabase
- Persistent data across sessions
- Can access all features
- Data syncs across devices

#### **Anonymous Users**
- No registration required
- Temporary `auth.users` record with `is_anonymous = true` (when enabled)
- Data stored in localStorage + cookies
- Can use most features (voice conversations, goal setting)
- Data can be migrated when they sign up

### 2. User Identification Flow

```
User Visits Site
       ↓
UserContext.tsx Loads
       ↓
Check Supabase Session
       ↓
    ┌──────────────┐
    │ Has Session? │
    └──────────────┘
       ↙     ↘
     Yes      No
      ↓        ↓
Set User    Create Anonymous
             User (localStorage)
      ↓        ↓
effectiveUserId = user.id || anonymousUser.id
```

### 3. Key Components

#### **UserContext.tsx** (`src/contexts/UserContext.tsx`)
- Central authentication state management
- Provides `useUser()` hook with:
  - `user`: Authenticated user object or null
  - `anonymousUser`: Anonymous user data or null
  - `isAnonymous`: Boolean flag
  - `effectiveUserId`: Always defined (authenticated or anonymous ID)
  - `isLoading`: Auth state loading indicator

#### **AnonymousUserService** (`src/lib/anonymous-user.ts`)
- Manages anonymous user lifecycle
- Generates IDs: `anon_{uuid}`
- Stores data in:
  - **Cookie**: `liveguide_anonymous_id` (30 days)
  - **localStorage**: `liveguide_anonymous_user` (full data)
- Handles data migration to authenticated accounts

#### **Middleware** (`src/middleware.ts`)
- Refreshes Supabase sessions
- Logs auth state for API routes
- Does NOT block anonymous users
- Adds CSP headers for development

### 4. How Components Distinguish User Types

```typescript
// In any component
const { user, isAnonymous, effectiveUserId } = useUser();

if (isAnonymous) {
  // Show limited features or sign-up prompts
  // Use effectiveUserId for data operations
} else {
  // Show full features
  // Use user.id for data operations
}
```

### 5. Anonymous User Data Storage

#### **Client-Side Storage**
```javascript
// Cookie
liveguide_anonymous_id = "anon_123e4567-e89b-12d3-a456-426614174000"

// localStorage
liveguide_anonymous_user = {
  "id": "anon_123e4567-e89b-12d3-a456-426614174000",
  "goals": [],
  "preferences": {},
  "progress": [],
  "sessions": [],
  "created_at": "2024-01-24T10:00:00Z",
  "last_activity": "2024-01-24T11:30:00Z"
}
```

#### **Server-Side (When Anonymous Auth Enabled)**
- Supabase creates `auth.users` record with `is_anonymous = true`
- RLS policies use `auth.uid()` which works for both user types
- All tables can store anonymous user data with their UUID

### 6. Data Migration Flow

When anonymous user signs up:
1. `migrateToAuthenticatedUser()` is called
2. Goals migrate to `user_goals` table
3. Preferences migrate to `user_questionnaire` table
4. Sessions and progress are preserved
5. Anonymous data is cleared from localStorage
6. User continues with authenticated session

### 7. Current Issue with Anonymous Sign-In

**Problem**: `supabase.auth.signInAnonymously()` is currently disabled (line 150 in anonymous-user.ts)
```typescript
// Temporarily disable anonymous sign-in to fix 500 error
console.log('Skipping anonymous sign-in due to server error')
return this.getAnonymousId()
```

**Impact**:
- Anonymous users exist only client-side
- Cannot persist data to database
- Voice conversations may redirect if expecting database user

**Solution**: Enable anonymous authentication in Supabase Dashboard:
1. Go to Authentication → Settings
2. Enable "Anonymous Sign-ins"
3. Uncomment lines 154-172 in `anonymous-user.ts`

### 8. Row Level Security (RLS)

All RLS policies use `auth.uid() = user_id` pattern:
- Works for both authenticated and anonymous users
- Anonymous users can only access their own data
- No special handling needed in queries

Example RLS policy:
```sql
CREATE POLICY "Users can manage their own data"
ON public.user_goals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 9. Interface Differences by User Type

#### **Anonymous Users See:**
- Guest welcome messages
- Sign-up prompts in key areas
- Limited agent selection (if configured)
- Local-only data warnings
- "Sign up to save progress" messages

#### **Authenticated Users See:**
- Personalized greetings
- Full agent library
- Saved conversations
- Cross-device sync indicators
- Profile settings

### 10. Testing Authentication States

```typescript
// Force anonymous state
await supabase.auth.signOut();

// Force authenticated state
await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password'
});

// Check current state
const { user, isAnonymous, effectiveUserId } = useUser();
console.log({
  type: isAnonymous ? 'anonymous' : 'authenticated',
  id: effectiveUserId,
  hasSupabaseUser: !!user
});
```

## Debugging Tips

1. **Check UserContext State**:
   ```javascript
   // In browser console
   const { user, anonymousUser, isAnonymous } = useUser();
   console.table({ user, anonymousUser, isAnonymous });
   ```

2. **View Anonymous Data**:
   ```javascript
   // Check localStorage
   localStorage.getItem('liveguide_anonymous_user')
   
   // Check cookie
   document.cookie.split(';').find(c => c.includes('liveguide_anonymous_id'))
   ```

3. **Monitor Auth Changes**:
   ```javascript
   supabase.auth.onAuthStateChange((event, session) => {
     console.log('Auth event:', event, session?.user?.id);
   });
   ```

## Common Issues and Solutions

### Issue: Voice redirect for anonymous users
**Cause**: Voice interface expects database user, but anonymous sign-in is disabled
**Solution**: Enable anonymous auth in Supabase or implement fallback handling

### Issue: Data loss on sign-out
**Cause**: Anonymous data cleared without migration
**Solution**: Prompt user to save data before signing out

### Issue: Duplicate user records
**Cause**: New anonymous ID generated after sign-out
**Solution**: This is by design for privacy, but can implement "restore session" feature

## Next Steps

1. **Enable Anonymous Auth in Supabase**:
   - Go to Dashboard → Authentication → Settings
   - Toggle "Enable anonymous sign-ins"
   - Update `anonymous-user.ts` to use `signInAnonymously()`

2. **Add Visual Indicators**:
   - Badge showing "Guest" vs username
   - Progress save warnings for anonymous users
   - Migration prompts at key moments

3. **Implement Graceful Fallbacks**:
   - Handle case where Supabase anonymous auth fails
   - Ensure voice conversations work with local-only anonymous users
   - Add retry logic for auth operations