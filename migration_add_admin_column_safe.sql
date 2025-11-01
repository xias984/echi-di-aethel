-- Migration script to add admin column to users table (safe version)
-- This script checks if the column exists before adding it to avoid errors

-- Check if column exists and add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'admin'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN admin BOOLEAN NOT NULL DEFAULT false;
        
        RAISE NOTICE 'Column admin added successfully to users table';
    ELSE
        RAISE NOTICE 'Column admin already exists in users table';
    END IF;
END $$;

-- Add comment to document the column (will update if comment exists)
COMMENT ON COLUMN public.users.admin IS 'Flag to indicate if user has admin privileges';

