
-- Add timing columns to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

-- Update existing resolved tickets to have resolved_at = updated_at for historical data
UPDATE tickets 
SET resolved_at = updated_at 
WHERE status = 'resolved' AND resolved_at IS NULL;

-- Update existing in_progress tickets to have accepted_at = updated_at for historical data  
UPDATE tickets 
SET accepted_at = updated_at 
WHERE status = 'in_progress' AND accepted_at IS NULL;
