-- Cleanup Auth Users Script
-- This script removes existing users and cleans up anonymous auth remnants
-- WARNING: This will delete all user data. Make sure to backup if needed.

-- 1. First, check what users exist
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    is_anonymous,
    raw_app_meta_data,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;

-- 2. Delete all anonymous users first
DELETE FROM auth.users
WHERE is_anonymous = true;

-- 3. Delete specific test users (update emails as needed)
-- DELETE FROM auth.users
-- WHERE email IN ('test@example.com', 'another@example.com');

-- 4. To delete ALL users (use with extreme caution)
-- Uncomment the following line only if you want to delete all users
-- DELETE FROM auth.users;

-- 5. Clean up any orphaned identities
DELETE FROM auth.identities
WHERE user_id::uuid NOT IN (SELECT id FROM auth.users);

-- 6. Clean up any orphaned sessions
DELETE FROM auth.sessions
WHERE user_id::uuid NOT IN (SELECT id FROM auth.users);

-- 7. Clean up any orphaned refresh tokens
DELETE FROM auth.refresh_tokens
WHERE user_id::uuid NOT IN (SELECT id FROM auth.users);

-- 8. Verify cleanup
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