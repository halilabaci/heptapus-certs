-- Migration 002: Add email verification and password reset fields to users table
-- Run after 001_add_cert_fields.sql

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verification_token VARCHAR(256),
    ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(256);

-- Superadmin accounts are treated as pre-verified
UPDATE users SET is_verified = TRUE WHERE role = 'superadmin';

-- Admin accounts created by superadmin via the UI are also pre-verified
-- (they received passwords directly, no email flow needed)
UPDATE users SET is_verified = TRUE WHERE role = 'admin';
