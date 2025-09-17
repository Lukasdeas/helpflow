
-- Add attachments column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';
