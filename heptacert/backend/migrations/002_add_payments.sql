-- Migration 002: Add payment tables (orders + subscriptions)
-- Run this after 001_add_cert_fields.sql

CREATE TABLE IF NOT EXISTS orders (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    plan_id      VARCHAR(64)  NOT NULL,
    amount_cents INTEGER      NOT NULL,
    currency     VARCHAR(8)   NOT NULL DEFAULT 'TRY',
    provider     VARCHAR(32)  NOT NULL,
    provider_ref VARCHAR(256),
    status       VARCHAR(32)  NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    paid_at      TIMESTAMPTZ,
    meta         JSONB        NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS ix_order_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS ix_order_status ON orders(status);

CREATE TABLE IF NOT EXISTS subscriptions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id    VARCHAR(64) NOT NULL,
    order_id   INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_sub_user ON subscriptions(user_id);
