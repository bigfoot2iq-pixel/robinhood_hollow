-- Add id_waitlisted column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE hollow_raffles_users ADD COLUMN id_waitlisted BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_users_waitlisted ON hollow_raffles_users(id_waitlisted) WHERE id_waitlisted = TRUE;
