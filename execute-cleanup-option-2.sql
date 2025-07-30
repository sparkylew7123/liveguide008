-- COMPLETE AUTH CLEANUP - OPTION 2
-- This will delete ALL users and cascade to all related tables

-- 1. First, let's see what we're about to delete
SELECT 
    id,
    email,
    is_anonymous,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. DELETE ALL USERS (this will cascade to all related tables)
DELETE FROM auth.users;

-- 3. Verify the cleanup was successful
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

-- All counts should be 0 after this operation