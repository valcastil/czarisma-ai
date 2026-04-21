-- =====================================================
-- Charisma Entries Performance Indexes
-- =====================================================
-- Adds composite index to speed up getEntries(user_id) queries
-- that filter by user_id and order by timestamp DESC.
-- Without this index, the query performs a full table scan, which
-- does not scale beyond a few thousand entries.

CREATE INDEX IF NOT EXISTS idx_charisma_entries_user_timestamp
  ON public.charisma_entries(user_id, timestamp DESC);

-- Optional: index for fast single-entry lookups by id (PK already covers this,
-- but including for completeness if a future query joins on id + user_id).
CREATE INDEX IF NOT EXISTS idx_charisma_entries_user_id
  ON public.charisma_entries(user_id);
