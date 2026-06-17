-- Admin wallets table
CREATE TABLE hollow_raffles_admin (
  wallet_address VARCHAR(42) PRIMARY KEY
    CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Enable Row Level Security
ALTER TABLE hollow_raffles_admin ENABLE ROW LEVEL SECURITY;

-- Admin wallets: service role only
CREATE POLICY "Admin wallets are viewable by service role" ON hollow_raffles_admin
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Admin wallets are insertable by service role" ON hollow_raffles_admin
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admin wallets are updatable by service role" ON hollow_raffles_admin
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Admin wallets are deletable by service role" ON hollow_raffles_admin
  FOR DELETE USING (auth.role() = 'service_role');
