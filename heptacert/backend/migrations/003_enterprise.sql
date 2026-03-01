-- 003_enterprise.sql — API Keys, TOTP, Audit Log, Webhooks, Organizations, Verification Hits
-- Idempotent: uses IF NOT EXISTS / DO $$ everywhere

-- ── API Keys ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(200) NOT NULL,
    key_prefix   VARCHAR(8)   NOT NULL,
    key_hash     VARCHAR(128) NOT NULL UNIQUE,
    scopes       JSONB        NOT NULL DEFAULT '["read","write"]',
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS ix_api_keys_prefix ON api_keys(key_prefix);

-- ── TOTP 2FA ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS totp_secrets (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    secret     VARCHAR(64) NOT NULL,
    enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64),
    resource_id   VARCHAR(128),
    ip_address    INET,
    user_agent    TEXT,
    extra         JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_action ON audit_logs(action);

-- ── Webhook Endpoints ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url          TEXT        NOT NULL,
    events       JSONB       NOT NULL DEFAULT '["cert.issued"]',
    secret       VARCHAR(64) NOT NULL,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_fired_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_webhook_user ON webhook_endpoints(user_id);

-- ── Webhook Deliveries ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id           BIGSERIAL PRIMARY KEY,
    endpoint_id  INTEGER NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_type   VARCHAR(64) NOT NULL,
    payload      JSONB   NOT NULL,
    status       VARCHAR(16) NOT NULL DEFAULT 'pending',
    http_status  INTEGER,
    response_body TEXT,
    attempt      SMALLINT NOT NULL DEFAULT 1,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_whdelivery_endpoint ON webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS ix_whdelivery_delivered ON webhook_deliveries(delivered_at DESC);

-- ── Organizations (White-Label) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_name      VARCHAR(200) NOT NULL,
    custom_domain VARCHAR(253) UNIQUE,
    brand_logo    TEXT,
    brand_color   VARCHAR(7) DEFAULT '#6366f1',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_user ON organizations(user_id);
CREATE INDEX IF NOT EXISTS ix_org_domain ON organizations(custom_domain);

-- ── Verification Hits (Analytics) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_hits (
    id           BIGSERIAL PRIMARY KEY,
    cert_uuid    VARCHAR(36) NOT NULL,
    viewed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address   INET,
    user_agent   TEXT,
    referer      TEXT
);
CREATE INDEX IF NOT EXISTS ix_vhit_uuid ON verification_hits(cert_uuid);
CREATE INDEX IF NOT EXISTS ix_vhit_viewed ON verification_hits(viewed_at DESC);
