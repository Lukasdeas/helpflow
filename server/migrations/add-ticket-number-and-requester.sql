
-- Add ticket number and requester name columns
ALTER TABLE tickets ADD COLUMN ticket_number INTEGER;
ALTER TABLE tickets ADD COLUMN requester_name TEXT;

-- Create a sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

-- Update existing tickets with sequential numbers
UPDATE tickets SET ticket_number = nextval('ticket_number_seq') WHERE ticket_number IS NULL;

-- Set default requester name for existing tickets
UPDATE tickets SET requester_name = COALESCE(user_email, 'Usuário Anônimo') WHERE requester_name IS NULL;

-- Make columns NOT NULL after setting values
ALTER TABLE tickets ALTER COLUMN ticket_number SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN requester_name SET NOT NULL;

-- Add unique constraint to ticket_number
ALTER TABLE tickets ADD CONSTRAINT tickets_ticket_number_unique UNIQUE (ticket_number);
