-- Durable, race-safe cooldown for the native zkLTC faucet (/api/faucet).
-- Replaces the in-memory Map in the route: this survives redeploys and is shared
-- across every serverless instance. Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS litvm_faucet_claims (
  wallet_address VARCHAR(42) PRIMARY KEY,          -- lowercased
  last_claim_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claim_count    INTEGER     NOT NULL DEFAULT 0,
  tx_hash        VARCHAR(66),
  amount         VARCHAR(78),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atomic "reserve a claim slot if the cooldown has elapsed".
-- Returns one row: allowed = whether the caller may drip now, and when not,
-- retry_after_seconds = how long until they can. The INSERT ... ON CONFLICT ...
-- WHERE guard makes this race-safe — two simultaneous requests for the same
-- wallet can never both reserve.
CREATE OR REPLACE FUNCTION litvm_faucet_try_claim(
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
  INSERT INTO litvm_faucet_claims (wallet_address, last_claim_at, claim_count)
  VALUES (v_wallet, now(), 1)
  ON CONFLICT (wallet_address) DO UPDATE
    SET last_claim_at = now(),
        claim_count   = litvm_faucet_claims.claim_count + 1
    WHERE litvm_faucet_claims.last_claim_at
          < now() - make_interval(secs => p_cooldown_seconds)
  RETURNING last_claim_at INTO v_reserved;

  -- A returned row means the insert/update went through → slot reserved.
  IF v_reserved IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, 0;
    RETURN;
  END IF;

  -- Conflict + cooldown not elapsed → no row touched. Compute remaining time.
  SELECT last_claim_at INTO v_last
  FROM litvm_faucet_claims
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
CREATE OR REPLACE FUNCTION litvm_faucet_release(p_wallet TEXT)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE litvm_faucet_claims
  SET last_claim_at = to_timestamp(0)
  WHERE wallet_address = lower(p_wallet);
$$;

-- RLS: only the service role (used by /api/faucet) touches this table.
ALTER TABLE litvm_faucet_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faucet claims are managed by service role" ON litvm_faucet_claims
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
