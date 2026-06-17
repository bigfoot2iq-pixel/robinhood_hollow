-- Add prizes table and simplify raffles schema

CREATE TABLE IF NOT EXISTS hollow_raffles_prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raffle_id UUID NOT NULL REFERENCES hollow_raffles_raffles(id) ON DELETE CASCADE,
  prize_type hollow_raffles_prize_type NOT NULL,
  prize_token_address VARCHAR(42) NOT NULL,
  prize_amount VARCHAR(78),
  prize_token_id VARCHAR(78),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_prize_data CHECK (
    (prize_type = 'erc20' AND prize_amount IS NOT NULL AND prize_token_id IS NULL) OR
    (prize_type IN ('erc721', 'erc6220') AND prize_token_id IS NOT NULL AND prize_amount IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_prizes_raffle ON hollow_raffles_prizes(raffle_id);

ALTER TABLE hollow_raffles_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prizes are viewable by everyone" ON hollow_raffles_prizes
  FOR SELECT USING (true);

CREATE POLICY "Prizes are insertable by service role" ON hollow_raffles_prizes
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Prizes are updatable by service role" ON hollow_raffles_prizes
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Prizes are deletable by service role" ON hollow_raffles_prizes
  FOR DELETE USING (auth.role() = 'service_role');

-- Migrate existing prize data into prizes table
INSERT INTO hollow_raffles_prizes (
  raffle_id,
  prize_type,
  prize_token_address,
  prize_amount,
  prize_token_id
)
SELECT
  id,
  prize_type,
  prize_token_address,
  trim(prize_amount_item),
  NULL
FROM hollow_raffles_raffles,
LATERAL unnest(string_to_array(prize_amount, ',')) AS prize_amount_item
WHERE prize_type = 'erc20' AND prize_amount IS NOT NULL;

INSERT INTO hollow_raffles_prizes (
  raffle_id,
  prize_type,
  prize_token_address,
  prize_amount,
  prize_token_id
)
SELECT
  id,
  prize_type,
  prize_token_address,
  NULL,
  trim(prize_token_id_item)
FROM hollow_raffles_raffles,
LATERAL unnest(string_to_array(prize_token_id, ',')) AS prize_token_id_item
WHERE prize_type IN ('erc721', 'erc6220') AND prize_token_id IS NOT NULL;

-- Drop unused indexes/constraints and columns
DROP INDEX IF EXISTS idx_raffles_status;
DROP INDEX IF EXISTS idx_raffles_status_dates;

ALTER TABLE hollow_raffles_raffles DROP CONSTRAINT IF EXISTS valid_prize;
ALTER TABLE hollow_raffles_raffles
  DROP COLUMN IF EXISTS prize_type,
  DROP COLUMN IF EXISTS prize_token_address,
  DROP COLUMN IF EXISTS prize_amount,
  DROP COLUMN IF EXISTS prize_token_id,
  DROP COLUMN IF EXISTS number_of_winners,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS current_participants;

-- Update admin stats function to use date-based status
CREATE OR REPLACE FUNCTION hollow_raffles_get_admin_stats()
RETURNS TABLE(
  total_raffles BIGINT,
  active_raffles BIGINT,
  total_entries BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM hollow_raffles_raffles)::BIGINT AS total_raffles,
    (SELECT COUNT(*) FROM hollow_raffles_raffles WHERE start_date <= NOW() AND end_date > NOW())::BIGINT AS active_raffles,
    (SELECT COALESCE(SUM(entry_count), 0) FROM hollow_raffles_entries)::BIGINT AS total_entries,
    (SELECT COUNT(*) FROM hollow_raffles_users)::BIGINT AS total_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
