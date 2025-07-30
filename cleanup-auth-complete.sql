-- Complete Auth Cleanup Script
-- This will clean up all auth data for a fresh start

-- 1. First, let's see what users we have
SELECT 
    u.id,
    u.email,
    u.is_anonymous,
    u.created_at,
    u.last_sign_in_at,
    COUNT(DISTINCT i.id) as identity_count,
    COUNT(DISTINCT s.id) as session_count
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
LEFT JOIN auth.sessions s ON s.user_id = u.id
GROUP BY u.id, u.email, u.is_anonymous, u.created_at, u.last_sign_in_at
ORDER BY u.created_at DESC;

-- 2. Check for orphaned identities (identities without users)
SELECT COUNT(*) as orphaned_identities
FROM auth.identities i
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = i.user_id
);

-- 3. Check for orphaned sessions
SELECT COUNT(*) as orphaned_sessions
FROM auth.sessions s
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = s.user_id
);

-- 4. Check for orphaned refresh tokens
SELECT COUNT(*) as orphaned_refresh_tokens
FROM auth.refresh_tokens r
WHERE r.session_id NOT IN (SELECT id FROM auth.sessions);

-- 5. CLEANUP OPTION 1: Delete ALL auth data for fresh start
-- This is the nuclear option - removes everything
/*
TRUNCATE auth.users CASCADE;
*/

-- 6. CLEANUP OPTION 2: Delete users one by one (safer)
-- First delete all users (this should cascade to other tables)
/*
DELETE FROM auth.users;
*/

-- 7. CLEANUP OPTION 3: Manual cleanup of orphaned records
-- Use this if you want to keep some users but clean orphans

-- Clean orphaned refresh tokens first
DELETE FROM auth.refresh_tokens
WHERE session_id NOT IN (SELECT id FROM auth.sessions);

-- Clean orphaned sessions
DELETE FROM auth.sessions
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned identities
DELETE FROM auth.identities
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 8. After cleanup, verify the counts
SELECT 
    'Users' as table_name, 
    COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
    'Identities' as table_name, 
    COUNT(*) as count 
FROM auth.identities
UNION ALL
SELECT 
    'Sessions' as table_name, 
    COUNT(*) as count 
FROM auth.sessions
UNION ALL
SELECT 
    'Refresh Tokens' as table_name, 
    COUNT(*) as count 
FROM auth.refresh_tokens;

-- 9. Optional: Check auth.flow_state table (if exists)
-- SELECT COUNT(*) as flow_states FROM auth.flow_state;
-- DELETE FROM auth.flow_state WHERE created_at < NOW() - INTERVAL '1 day';