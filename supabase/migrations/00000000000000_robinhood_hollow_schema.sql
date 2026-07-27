-- Robinhood Hollow — consolidated schema
--
-- Single source of truth. Replaces the previous 001..20260619 migration series,
-- which was never run; this file is that series' final state with every table,
-- function, type, trigger and index renamed to the robinhood_hollow_* prefix.
--
-- Squash notes (differences from the old 001 initial schema, already applied here):
--   * raffles.max_tokens_per_user was renamed to max_entries_per_user (20260618).
--   * raffles no longer carries prize columns, number_of_winners, status or
--     current_participants — prizes moved to their own table (004); status is
--     derived from start_date/end_date.
--   * raffles.slug and its auto-generating trigger (20250212) are inlined.
--   * users carries id_waitlisted (20250213) and free_mint_reserved (20260403).
--   * game_users carries game_score (20241223).
-- The old data-backfill statements (prize column -> prizes rows, token cap ->
-- entry cap) are intentionally omitted: there is no pre-existing data to migrate.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

CREATE TYPE robinhood_hollow_prize_type AS ENUM ('erc20', 'erc721', 'erc6220');
CREATE TYPE robinhood_hollow_transaction_type AS ENUM ('token_purchase', 'raffle_entry', 'prize_distribution');

-- ---------------------------------------------------------------------------
-- Shared trigger function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION robinhood_hollow_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Raffles
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_raffles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain_raffle_id INTEGER UNIQUE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  image_url TEXT,
  tokens_required INTEGER NOT NULL CHECK (tokens_required > 0),
  max_entries_per_user INTEGER NOT NULL CHECK (max_entries_per_user > 0),
  max_participants INTEGER NOT NULL CHECK (max_participants > 0),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT robinhood_hollow_valid_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_robinhood_hollow_raffles_dates ON robinhood_hollow_raffles(start_date, end_date);
CREATE INDEX idx_robinhood_hollow_raffles_slug ON robinhood_hollow_raffles(slug);

CREATE TRIGGER robinhood_hollow_update_raffles_updated_at
  BEFORE UPDATE ON robinhood_hollow_raffles
  FOR EACH ROW EXECUTE FUNCTION robinhood_hollow_update_updated_at_column();

-- Slug generation: lowercase, strip non-alphanumerics, collapse spaces to '_'.
CREATE OR REPLACE FUNCTION robinhood_hollow_generate_raffle_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'),
      '\s+',
      '_',
      'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION robinhood_hollow_set_raffle_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = robinhood_hollow_generate_raffle_slug(COALESCE(NEW.title, NEW.id::TEXT));
  ELSE
    -- Normalise a caller-provided slug the same way.
    NEW.slug = robinhood_hollow_generate_raffle_slug(NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER robinhood_hollow_trigger_set_raffle_slug
  BEFORE INSERT ON robinhood_hollow_raffles
  FOR EACH ROW EXECUTE FUNCTION robinhood_hollow_set_raffle_slug();

-- ---------------------------------------------------------------------------
-- Prizes
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raffle_id UUID NOT NULL REFERENCES robinhood_hollow_raffles(id) ON DELETE CASCADE,
  prize_type robinhood_hollow_prize_type NOT NULL,
  prize_token_address VARCHAR(42) NOT NULL,
  prize_amount VARCHAR(78),
  prize_token_id VARCHAR(78),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT robinhood_hollow_valid_prize_data CHECK (
    (prize_type = 'erc20' AND prize_amount IS NOT NULL AND prize_token_id IS NULL) OR
    (prize_type IN ('erc721', 'erc6220') AND prize_token_id IS NOT NULL AND prize_amount IS NULL)
  )
);

CREATE INDEX idx_robinhood_hollow_prizes_raffle ON robinhood_hollow_prizes(raffle_id);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  total_entries INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  id_waitlisted BOOLEAN DEFAULT FALSE,
  free_mint_reserved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_robinhood_hollow_users_wallet ON robinhood_hollow_users(wallet_address);
CREATE INDEX idx_robinhood_hollow_users_waitlisted
  ON robinhood_hollow_users(id_waitlisted) WHERE id_waitlisted = TRUE;
CREATE INDEX idx_robinhood_hollow_users_free_mint_reserved
  ON robinhood_hollow_users(free_mint_reserved) WHERE free_mint_reserved = TRUE;

CREATE TRIGGER robinhood_hollow_update_users_updated_at
  BEFORE UPDATE ON robinhood_hollow_users
  FOR EACH ROW EXECUTE FUNCTION robinhood_hollow_update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Entries
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raffle_id UUID NOT NULL REFERENCES robinhood_hollow_raffles(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  tokens_spent INTEGER NOT NULL CHECK (tokens_spent > 0),
  entry_count INTEGER NOT NULL CHECK (entry_count > 0),
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT robinhood_hollow_unique_entry_per_raffle_per_wallet UNIQUE (raffle_id, wallet_address)
);

CREATE INDEX idx_robinhood_hollow_entries_raffle ON robinhood_hollow_entries(raffle_id);
CREATE INDEX idx_robinhood_hollow_entries_wallet ON robinhood_hollow_entries(wallet_address);

-- ---------------------------------------------------------------------------
-- Winners
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raffle_id UUID NOT NULL REFERENCES robinhood_hollow_raffles(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  prize_amount VARCHAR(78),
  prize_token_id VARCHAR(78),
  distribution_tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_robinhood_hollow_winners_raffle ON robinhood_hollow_winners(raffle_id);
CREATE INDEX idx_robinhood_hollow_winners_wallet ON robinhood_hollow_winners(wallet_address);

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(42) NOT NULL,
  type robinhood_hollow_transaction_type NOT NULL,
  amount VARCHAR(78) NOT NULL,
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  raffle_id UUID REFERENCES robinhood_hollow_raffles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_robinhood_hollow_transactions_wallet ON robinhood_hollow_transactions(wallet_address);
CREATE INDEX idx_robinhood_hollow_transactions_type ON robinhood_hollow_transactions(type);

-- ---------------------------------------------------------------------------
-- Admin wallets + audit log
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_admin (
  wallet_address VARCHAR(42) PRIMARY KEY
    CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$')
);

CREATE TABLE robinhood_hollow_admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_wallet VARCHAR(42) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Site config
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO robinhood_hollow_config (key, value)
VALUES ('waitlist_participants', '12847')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Game users (leaderboard profiles — separate from robinhood_hollow_users)
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_game_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  wallet_type TEXT NOT NULL DEFAULT 'evm',
  username TEXT,
  is_registered BOOLEAN NOT NULL DEFAULT FALSE,
  is_whitelisted BOOLEAN NOT NULL DEFAULT FALSE,
  x_username TEXT,
  x_avatar_url TEXT,
  x_user_id TEXT,
  image_url TEXT,
  game_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_robinhood_hollow_game_users_game_score
  ON robinhood_hollow_game_users(game_score DESC);

CREATE TRIGGER robinhood_hollow_update_game_users_updated_at
  BEFORE UPDATE ON robinhood_hollow_game_users
  FOR EACH ROW EXECUTE FUNCTION robinhood_hollow_update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Game sessions (pay-to-play)
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES robinhood_hollow_game_users(id) ON DELETE CASCADE,
  tx_hash TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  final_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_robinhood_hollow_game_sessions_user_id ON robinhood_hollow_game_sessions(user_id);
CREATE INDEX idx_robinhood_hollow_game_sessions_status ON robinhood_hollow_game_sessions(status);
CREATE INDEX idx_robinhood_hollow_game_sessions_tx_hash ON robinhood_hollow_game_sessions(tx_hash);

-- ---------------------------------------------------------------------------
-- Faucet claims (native zkLTC drip cooldown)
-- ---------------------------------------------------------------------------

CREATE TABLE robinhood_hollow_faucet_claims (
  wallet_address VARCHAR(42) PRIMARY KEY,          -- lowercased
  last_claim_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claim_count    INTEGER     NOT NULL DEFAULT 0,
  tx_hash        VARCHAR(66),
  amount         VARCHAR(78),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================================================
-- Functions
-- ===========================================================================

CREATE OR REPLACE FUNCTION robinhood_hollow_increment_user_entries(p_wallet VARCHAR(42), p_count INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO robinhood_hollow_users (wallet_address, total_entries)
  VALUES (p_wallet, p_count)
  ON CONFLICT (wallet_address)
  DO UPDATE SET total_entries = robinhood_hollow_users.total_entries + p_count, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION robinhood_hollow_increment_user_wins(p_wallet VARCHAR(42))
RETURNS VOID AS $$
BEGIN
  INSERT INTO robinhood_hollow_users (wallet_address, total_wins)
  VALUES (p_wallet, 1)
  ON CONFLICT (wallet_address)
  DO UPDATE SET total_wins = robinhood_hollow_users.total_wins + 1, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Active = now falls inside [start_date, end_date); raffles carry no status column.
CREATE OR REPLACE FUNCTION robinhood_hollow_get_admin_stats()
RETURNS TABLE(
  total_raffles BIGINT,
  active_raffles BIGINT,
  total_entries BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM robinhood_hollow_raffles)::BIGINT AS total_raffles,
    (SELECT COUNT(*) FROM robinhood_hollow_raffles WHERE start_date <= NOW() AND end_date > NOW())::BIGINT AS active_raffles,
    (SELECT COALESCE(SUM(entry_count), 0) FROM robinhood_hollow_entries)::BIGINT AS total_entries,
    (SELECT COUNT(*) FROM robinhood_hollow_users)::BIGINT AS total_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reserve a free mint spot atomically with a hard cap.
CREATE OR REPLACE FUNCTION robinhood_hollow_reserve_free_mint_spot(
  p_wallet VARCHAR(42),
  p_max_spots INTEGER DEFAULT 200
)
RETURNS TABLE (
  success BOOLEAN,
  already_reserved BOOLEAN,
  reserved_count INTEGER
) AS $$
DECLARE
  v_already_reserved BOOLEAN := FALSE;
  v_reserved_count INTEGER := 0;
BEGIN
  -- Serialize reservations to enforce the cap safely.
  PERFORM pg_advisory_xact_lock(hashtext('robinhood_hollow_free_mint_reserve'));

  INSERT INTO robinhood_hollow_users (wallet_address)
  VALUES (LOWER(p_wallet))
  ON CONFLICT (wallet_address) DO NOTHING;

  SELECT free_mint_reserved
  INTO v_already_reserved
  FROM robinhood_hollow_users
  WHERE wallet_address = LOWER(p_wallet);

  IF COALESCE(v_already_reserved, FALSE) THEN
    SELECT COUNT(*)::INTEGER
    INTO v_reserved_count
    FROM robinhood_hollow_users
    WHERE free_mint_reserved = TRUE;

    RETURN QUERY SELECT TRUE, TRUE, v_reserved_count;
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_reserved_count
  FROM robinhood_hollow_users
  WHERE free_mint_reserved = TRUE;

  IF v_reserved_count >= p_max_spots THEN
    RETURN QUERY SELECT FALSE, FALSE, v_reserved_count;
    RETURN;
  END IF;

  UPDATE robinhood_hollow_users
  SET free_mint_reserved = TRUE
  WHERE wallet_address = LOWER(p_wallet)
    AND free_mint_reserved = FALSE;

  RETURN QUERY SELECT TRUE, FALSE, v_reserved_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert a game profile on wallet connection. SECURITY DEFINER so the insert
-- path works regardless of RLS. Arg names match the supabase.rpc call.
CREATE OR REPLACE FUNCTION robinhood_hollow_upsert_game_user(
  wallet TEXT,
  wallet_type TEXT DEFAULT 'evm'
)
RETURNS robinhood_hollow_game_users AS $$
DECLARE
  result robinhood_hollow_game_users;
BEGIN
  INSERT INTO robinhood_hollow_game_users (wallet_address, wallet_type)
  VALUES (wallet, wallet_type)
  ON CONFLICT (wallet_address)
  DO UPDATE SET updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Raise a high score, no-op when the stored score is already higher.
CREATE OR REPLACE FUNCTION robinhood_hollow_update_game_score(
  user_wallet TEXT,
  new_score INTEGER
)
RETURNS JSON AS $$
DECLARE
  current_score INTEGER;
  updated BOOLEAN := false;
  user_rank INTEGER;
  user_record robinhood_hollow_game_users;
BEGIN
  SELECT * INTO user_record
  FROM robinhood_hollow_game_users
  WHERE wallet_address = user_wallet;

  IF user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'updated', false,
      'current_score', 0,
      'rank', null,
      'message', 'User not found'
    );
  END IF;

  current_score := COALESCE(user_record.game_score, 0);

  IF new_score > current_score THEN
    UPDATE robinhood_hollow_game_users
    SET game_score = new_score, updated_at = NOW()
    WHERE wallet_address = user_wallet;
    updated := true;
    current_score := new_score;
  END IF;

  SELECT COUNT(*) + 1 INTO user_rank
  FROM robinhood_hollow_game_users
  WHERE game_score > current_score;

  RETURN json_build_object(
    'success', true,
    'updated', updated,
    'current_score', current_score,
    'rank', user_rank,
    'message', CASE
      WHEN updated THEN 'New high score achieved!'
      ELSE 'Score not updated - current score is higher'
    END
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION robinhood_hollow_get_leaderboard(
  limit_count INTEGER DEFAULT 10,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  rank BIGINT,
  wallet_address TEXT,
  username TEXT,
  image_url TEXT,
  x_avatar_url TEXT,
  game_score INTEGER,
  is_registered BOOLEAN,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY u.game_score DESC, u.updated_at ASC) as user_rank,
      u.wallet_address,
      u.username,
      u.image_url,
      u.x_avatar_url,
      u.game_score,
      u.is_registered,
      COUNT(*) OVER() as total_users
    FROM robinhood_hollow_game_users u
    WHERE u.game_score > 0
    ORDER BY u.game_score DESC, u.updated_at ASC
  )
  SELECT
    ru.user_rank,
    ru.wallet_address,
    ru.username,
    ru.image_url,
    ru.x_avatar_url,
    ru.game_score,
    ru.is_registered,
    ru.total_users
  FROM ranked_users ru
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Create a game session after payment verification.
CREATE OR REPLACE FUNCTION robinhood_hollow_create_game_session(
  user_wallet TEXT,
  payment_tx_hash TEXT
)
RETURNS JSON AS $$
DECLARE
  user_record robinhood_hollow_game_users;
  session_record robinhood_hollow_game_sessions;
  existing_active_session robinhood_hollow_game_sessions;
BEGIN
  SELECT * INTO user_record
  FROM robinhood_hollow_game_users
  WHERE wallet_address = user_wallet;

  IF user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- One session per payment.
  IF EXISTS (SELECT 1 FROM robinhood_hollow_game_sessions WHERE tx_hash = payment_tx_hash) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction already used'
    );
  END IF;

  -- Expire any stale active sessions for this user.
  UPDATE robinhood_hollow_game_sessions
  SET status = 'expired', completed_at = NOW()
  WHERE user_id = user_record.id
    AND status = 'active'
    AND expires_at < NOW();

  SELECT * INTO existing_active_session
  FROM robinhood_hollow_game_sessions
  WHERE user_id = user_record.id
    AND status = 'active'
    AND expires_at > NOW()
  LIMIT 1;

  IF existing_active_session.id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Active session already exists',
      'session_id', existing_active_session.id
    );
  END IF;

  INSERT INTO robinhood_hollow_game_sessions (user_id, tx_hash)
  VALUES (user_record.id, payment_tx_hash)
  RETURNING * INTO session_record;

  RETURN json_build_object(
    'success', true,
    'session_id', session_record.id,
    'expires_at', session_record.expires_at
  );
END;
$$ LANGUAGE plpgsql;

-- Complete a session AND update the high score atomically.
CREATE OR REPLACE FUNCTION robinhood_hollow_complete_game_session(
  p_session_id UUID,
  p_user_wallet TEXT,
  p_final_score INTEGER
)
RETURNS JSON AS $$
DECLARE
  session_record robinhood_hollow_game_sessions;
  user_record robinhood_hollow_game_users;
  current_high_score INTEGER;
  score_updated BOOLEAN := false;
  user_rank INTEGER;
BEGIN
  SELECT * INTO user_record
  FROM robinhood_hollow_game_users
  WHERE wallet_address = p_user_wallet;

  IF user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  SELECT * INTO session_record
  FROM robinhood_hollow_game_sessions
  WHERE id = p_session_id
    AND user_id = user_record.id;

  IF session_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found or does not belong to user'
    );
  END IF;

  IF session_record.status != 'active' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session is not active',
      'status', session_record.status
    );
  END IF;

  IF session_record.expires_at < NOW() THEN
    UPDATE robinhood_hollow_game_sessions
    SET status = 'expired', completed_at = NOW()
    WHERE id = p_session_id;

    RETURN json_build_object(
      'success', false,
      'error', 'Session has expired'
    );
  END IF;

  UPDATE robinhood_hollow_game_sessions
  SET
    status = 'completed',
    final_score = p_final_score,
    completed_at = NOW()
  WHERE id = p_session_id;

  current_high_score := COALESCE(user_record.game_score, 0);

  IF p_final_score > current_high_score THEN
    UPDATE robinhood_hollow_game_users
    SET game_score = p_final_score, updated_at = NOW()
    WHERE id = user_record.id;

    score_updated := true;
    current_high_score := p_final_score;
  END IF;

  SELECT COUNT(*) + 1 INTO user_rank
  FROM robinhood_hollow_game_users
  WHERE game_score > current_high_score;

  RETURN json_build_object(
    'success', true,
    'session_completed', true,
    'score_updated', score_updated,
    'final_score', p_final_score,
    'high_score', current_high_score,
    'rank', user_rank,
    'message', CASE
      WHEN score_updated THEN 'New high score achieved!'
      ELSE 'Session completed. Score not updated - current high score is higher.'
    END
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION robinhood_hollow_get_active_session(
  p_user_wallet TEXT
)
RETURNS JSON AS $$
DECLARE
  user_record robinhood_hollow_game_users;
  session_record robinhood_hollow_game_sessions;
BEGIN
  SELECT * INTO user_record
  FROM robinhood_hollow_game_users
  WHERE wallet_address = p_user_wallet;

  IF user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'has_active_session', false,
      'reason', 'User not found'
    );
  END IF;

  UPDATE robinhood_hollow_game_sessions
  SET status = 'expired', completed_at = NOW()
  WHERE user_id = user_record.id
    AND status = 'active'
    AND expires_at < NOW();

  SELECT * INTO session_record
  FROM robinhood_hollow_game_sessions
  WHERE user_id = user_record.id
    AND status = 'active'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF session_record.id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'has_active_session', true,
      'session_id', session_record.id,
      'expires_at', session_record.expires_at,
      'created_at', session_record.created_at
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'has_active_session', false
  );
END;
$$ LANGUAGE plpgsql;

-- Atomic "reserve a claim slot if the cooldown has elapsed". Returns one row:
-- allowed = whether the caller may drip now, and when not, retry_after_seconds.
-- The INSERT ... ON CONFLICT ... WHERE guard makes this race-safe — two
-- simultaneous requests for the same wallet can never both reserve.
CREATE OR REPLACE FUNCTION robinhood_hollow_faucet_try_claim(
  p_wallet           TEXT,
  p_cooldown_seconds INTEGER
)
RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet   TEXT := lower(p_wallet);
  v_reserved TIMESTAMPTZ;
  v_last     TIMESTAMPTZ;
BEGIN
  INSERT INTO robinhood_hollow_faucet_claims (wallet_address, last_claim_at, claim_count)
  VALUES (v_wallet, now(), 1)
  ON CONFLICT (wallet_address) DO UPDATE
    SET last_claim_at = now(),
        claim_count   = robinhood_hollow_faucet_claims.claim_count + 1
    WHERE robinhood_hollow_faucet_claims.last_claim_at
          < now() - make_interval(secs => p_cooldown_seconds)
  RETURNING last_claim_at INTO v_reserved;

  -- A returned row means the insert/update went through → slot reserved.
  IF v_reserved IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, 0;
    RETURN;
  END IF;

  -- Conflict + cooldown not elapsed → no row touched. Compute remaining time.
  SELECT last_claim_at INTO v_last
  FROM robinhood_hollow_faucet_claims
  WHERE wallet_address = v_wallet;

  RETURN QUERY
    SELECT FALSE,
           GREATEST(0, p_cooldown_seconds - EXTRACT(EPOCH FROM (now() - v_last))::INTEGER);
END;
$$;

-- Undo a reservation when the on-chain send fails, so a failed drip doesn't lock
-- the user out for the full cooldown. Pushing last_claim_at to the epoch lets them
-- retry immediately; it only discards a prior claim that was already outside the
-- window (irrelevant to future cooldown checks).
CREATE OR REPLACE FUNCTION robinhood_hollow_faucet_release(p_wallet TEXT)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE robinhood_hollow_faucet_claims
  SET last_claim_at = to_timestamp(0)
  WHERE wallet_address = lower(p_wallet);
$$;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================

ALTER TABLE robinhood_hollow_raffles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE robinhood_hollow_prizes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE robinhood_hollow_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE robinhood_hollow_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE robinhood_hollow_winners        ENABLE ROW LEVEL SECURITY;
ALTER TABLE robinhood_hollow_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE robinhood_hollow_admin          ENABLE ROW LEVEL SECURITY;
ALTER TABLE robinhood_hollow_admin_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE robinhood_hollow_game_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE robinhood_hollow_game_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE robinhood_hollow_faucet_claims  ENABLE ROW LEVEL SECURITY;

-- Raffles: public read, service-role write.
CREATE POLICY "Raffles are viewable by everyone" ON robinhood_hollow_raffles
  FOR SELECT USING (true);
CREATE POLICY "Raffles are insertable by service role" ON robinhood_hollow_raffles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Raffles are updatable by service role" ON robinhood_hollow_raffles
  FOR UPDATE USING (auth.role() = 'service_role');

-- Prizes: public read, service-role write.
CREATE POLICY "Prizes are viewable by everyone" ON robinhood_hollow_prizes
  FOR SELECT USING (true);
CREATE POLICY "Prizes are insertable by service role" ON robinhood_hollow_prizes
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Prizes are updatable by service role" ON robinhood_hollow_prizes
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Prizes are deletable by service role" ON robinhood_hollow_prizes
  FOR DELETE USING (auth.role() = 'service_role');

-- Users: public read, service-role write.
CREATE POLICY "Users can view their own profile" ON robinhood_hollow_users
  FOR SELECT USING (true);
CREATE POLICY "Users are insertable by service role" ON robinhood_hollow_users
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Users are updatable by service role" ON robinhood_hollow_users
  FOR UPDATE USING (auth.role() = 'service_role');

-- Entries: public read (transparency), service-role write.
CREATE POLICY "Entries are viewable by everyone" ON robinhood_hollow_entries
  FOR SELECT USING (true);
CREATE POLICY "Entries are insertable by service role" ON robinhood_hollow_entries
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Winners: public read (transparency), service-role write.
CREATE POLICY "Winners are viewable by everyone" ON robinhood_hollow_winners
  FOR SELECT USING (true);
CREATE POLICY "Winners are insertable by service role" ON robinhood_hollow_winners
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Winners are updatable by service role" ON robinhood_hollow_winners
  FOR UPDATE USING (auth.role() = 'service_role');

-- Transactions: public read (transparency), service-role write.
CREATE POLICY "Transactions are viewable by everyone" ON robinhood_hollow_transactions
  FOR SELECT USING (true);
CREATE POLICY "Transactions are insertable by service role" ON robinhood_hollow_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Admin wallets: service role only.
CREATE POLICY "Admin wallets are viewable by service role" ON robinhood_hollow_admin
  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Admin wallets are insertable by service role" ON robinhood_hollow_admin
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admin wallets are updatable by service role" ON robinhood_hollow_admin
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Admin wallets are deletable by service role" ON robinhood_hollow_admin
  FOR DELETE USING (auth.role() = 'service_role');

-- Admin logs: service role only.
CREATE POLICY "Admin logs are viewable by service role" ON robinhood_hollow_admin_logs
  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Admin logs are insertable by service role" ON robinhood_hollow_admin_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Game users: the client uses the anon key, so reads/writes must be permissive.
CREATE POLICY "Game users are viewable by everyone" ON robinhood_hollow_game_users
  FOR SELECT USING (true);
CREATE POLICY "Game users are insertable by anyone" ON robinhood_hollow_game_users
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Game users are updatable by anyone" ON robinhood_hollow_game_users
  FOR UPDATE USING (true);

-- Game sessions: same anon-key constraint as game users.
CREATE POLICY "Users can read own sessions" ON robinhood_hollow_game_sessions
  FOR SELECT USING (true);
CREATE POLICY "Server can insert sessions" ON robinhood_hollow_game_sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Server can update sessions" ON robinhood_hollow_game_sessions
  FOR UPDATE USING (true);

-- Faucet claims: only the service role (used by /api/faucet) touches this table.
CREATE POLICY "Faucet claims are managed by service role" ON robinhood_hollow_faucet_claims
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
