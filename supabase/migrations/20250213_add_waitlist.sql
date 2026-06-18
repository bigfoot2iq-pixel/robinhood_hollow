-- Add id_waitlisted column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE litvm_raffle_users ADD COLUMN id_waitlisted BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_litvm_raffle_users_waitlisted ON litvm_raffle_users(id_waitlisted) WHERE id_waitlisted = TRUE;
