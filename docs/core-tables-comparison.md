# Core Tables Comparison: Production vs Dev

## Summary: All Core Tables Are Identical ✅

After comprehensive analysis, all core goal-related tables have **identical structures** between production and dev environments.

## Table-by-Table Comparison

### 1. user_goals ✅ IDENTICAL
**12 columns, all matching:**
- `id` (uuid) - Primary key
- `user_id` (uuid) - Links to user
- `goal_title` (text)
- `goal_description` (text) 
- `goal_status` (text) - Default: 'pending'
- `metadata` (jsonb) - Default: '{}'
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `profile_id` (uuid) - Links to profiles
- `category_id` (text) - Links to goal_categories
- `target_date` (timestamptz)
- `milestones` (jsonb) - Default: '[]'

### 2. goal_categories ✅ IDENTICAL
**6 columns, all matching:**
- `id` (text) - Primary key (e.g., 'career', 'health')
- `title` (text) - Display name
- `display_color` (text) - Hex color code
- `icon_name` (text) - Icon identifier
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 3. goal_progress ✅ IDENTICAL
**11 columns, all matching:**
- `id` (uuid) - Primary key
- `user_id` (uuid) - Links to user
- `goal_id` (uuid) - Links to user_goals
- `milestone` (text) - Required
- `description` (text)
- `progress_percentage` (integer) - Default: 0
- `conversation_id` (text) - Links to voice conversations
- `evidence` (jsonb) - Default: '{}'
- `status` (text) - Default: 'in_progress'
- `completed_at` (timestamptz)
- `created_at` (timestamptz)

### 4. profiles ✅ IDENTICAL
**12 columns, all matching:**
- `id` (uuid) - Primary key
- `username` (text)
- `avatar_url` (text)
- `updated_at` (timestamptz)
- `full_name` (text)
- `locale` (text)
- `preferences` (jsonb) - User preferences
- `created_at` (timestamptz)
- `onboarding_completed_at` (timestamptz)
- `coaching_preferences` (jsonb)
- `selected_goals` (jsonb)
- `goals_updated_at` (timestamptz)

## Foreign Key Relationships ✅ IDENTICAL

All foreign key constraints are consistent between environments:

1. **user_goals** → **goal_categories**
   - `category_id` → `goal_categories.id`

2. **user_goals** → **profiles**
   - `profile_id` → `profiles.id`

3. **goal_progress** → **user_goals**
   - `goal_id` → `user_goals.id`

## Data Type Consistency

All data types match exactly:
- UUIDs for primary keys and foreign keys
- Text fields for names and descriptions
- JSONB for flexible metadata storage
- Timestamps with timezone for temporal data
- Integer for progress percentages

## Key Findings

1. **No structural differences** in core goal-related tables
2. **Data types are consistent** across environments
3. **Foreign key relationships** properly maintained
4. **Default values** match exactly

## Implications

- ✅ Safe to migrate data between environments for these tables
- ✅ Application code will work identically with both schemas
- ✅ No risk of data type mismatches
- ✅ Foreign key constraints will be honored

## Conclusion

The core goal management tables are perfectly synchronized between production and dev. The only differences we found earlier were in the `graph_nodes` table (now fixed) and some auxiliary tables. The fundamental goal tracking infrastructure is consistent and stable across both environments.