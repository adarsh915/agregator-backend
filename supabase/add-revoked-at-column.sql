-- ============================================
-- ADD MISSING revoked_at COLUMN
-- ============================================

-- Add revoked_at column to user_roles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' 
        AND column_name = 'revoked_at'
    ) THEN
        ALTER TABLE user_roles 
        ADD COLUMN revoked_at TIMESTAMPTZ NULL;
        
        RAISE NOTICE 'Added revoked_at column to user_roles table';
    ELSE
        RAISE NOTICE 'revoked_at column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;
