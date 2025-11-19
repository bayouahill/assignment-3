-- SQL Migration Script: Add 'level' column to users table
-- This script adds a new column 'level' to track Manager (M) or User (U) roles

-- Add the level column (VARCHAR(1)) to the users table
ALTER TABLE users
ADD COLUMN level VARCHAR(1) DEFAULT 'U';

-- Add a check constraint to ensure only 'M' or 'U' values are allowed
ALTER TABLE users
ADD CONSTRAINT check_user_level CHECK (level IN ('M', 'U'));

-- Optional: Update any existing users to have a default level of 'U' (User)
-- This is already handled by the DEFAULT 'U' above, but shown for clarity
UPDATE users
SET level = 'U'
WHERE level IS NULL;

-- Optional: Set a specific user as Manager for testing
-- Uncomment and modify the username below to make a user a Manager
-- UPDATE users
-- SET level = 'M'
-- WHERE username = 'admin';

-- Verify the changes
SELECT * FROM users;
