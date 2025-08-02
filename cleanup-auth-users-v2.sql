    -- Cleanup Auth Users Script V2
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

    -- 2. Count users by type
    SELECT 
        CASE 
            WHEN is_anonymous = true THEN 'Anonymous'
            ELSE 'Regular'
        END as user_type,
        COUNT(*) as count
    FROM auth.users
    GROUP BY is_anonymous;

    -- 3. Delete all anonymous users first
    DELETE FROM auth.users
    WHERE is_anonymous = true;

    -- 4. Delete specific test users (update emails as needed)
    -- DELETE FROM auth.users
    -- WHERE email IN ('test@example.com', 'another@example.com');

    -- 5. To delete ALL users (use with extreme caution)
    -- This will cascade delete related records in identities, sessions, etc.
    -- due to foreign key constraints
    -- TRUNCATE auth.users CASCADE;

    -- Alternative: Delete all users
    -- DELETE FROM auth.users;

    -- 6. Verify cleanup - check remaining counts
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

    -- 7. If you need to clean up related tables manually (usually not needed due to CASCADE)
    -- The auth schema uses proper foreign keys with CASCADE DELETE, so deleting users
    -- should automatically clean up related records