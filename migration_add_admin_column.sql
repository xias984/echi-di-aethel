-- Migration script to add admin column to users table
-- This script adds the admin flag column to enable admin functionality

-- Add admin column to users table
ALTER TABLE public.users 
ADD COLUMN admin BOOLEAN NOT NULL DEFAULT false;

-- Optional: Add a comment to document the column
COMMENT ON COLUMN public.users.admin IS 'Flag to indicate if user has admin privileges';

