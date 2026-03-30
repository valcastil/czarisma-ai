-- Add reactions column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS reactions text[] DEFAULT '{}';

-- Add index for better query performance on reactions
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING GIN (reactions);

-- Add comment to document the column
COMMENT ON COLUMN messages.reactions IS 'Array of emoji reactions added to the message';
