-- Comprehensive schema comparison script
-- Run this in both production and dev to compare

-- 1. Count tables by type
SELECT 
    'Table Count Summary' as report_section,
    table_type,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
GROUP BY table_type
ORDER BY table_type;

-- 2. List all tables
SELECT 
    'All Tables' as report_section,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type IN ('BASE TABLE', 'VIEW')
ORDER BY table_type, table_name;

-- 3. Column count per table
SELECT 
    'Column Count per Table' as report_section,
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  )
GROUP BY table_name
ORDER BY table_name;

-- 4. Detailed schema for key tables
SELECT 
    'Key Table Schemas' as report_section,
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'graph_nodes',
    'graph_edges', 
    'user_goals',
    'profiles',
    'voice_chat_events',
    'agent_personae',
    'knowledge_documents'
  )
ORDER BY c.table_name, c.ordinal_position;

-- 5. Check for custom types
SELECT 
    'Custom Types' as report_section,
    typname as type_name,
    typtype as type_type,
    CASE 
        WHEN typtype = 'e' THEN array_to_string(ARRAY(SELECT enumlabel FROM pg_enum WHERE enumtypid = pg_type.oid ORDER BY enumsortorder), ', ')
        ELSE NULL
    END as enum_values
FROM pg_type
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND typtype IN ('e', 'c', 'd')
ORDER BY typname;

-- 6. Foreign key relationships
SELECT 
    'Foreign Key Relationships' as report_section,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 7. Indexes summary
SELECT 
    'Index Summary' as report_section,
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 8. Check for triggers
SELECT 
    'Triggers' as report_section,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 9. Check for functions
SELECT 
    'Functions' as report_section,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;