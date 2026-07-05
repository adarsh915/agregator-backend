-- ============================================================
-- KAEL AGGREGATOR — AUDIT LOG SCHEMA
-- Run in Supabase Dashboard > SQL Editor
-- Logs are kept FOREVER (no auto-delete / retention policy)
-- ============================================================

-- ============================================================
-- 1. AUDIT LOGS TABLE (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aggregator_audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  actor_id      UUID        REFERENCES public.aggregator_users(id) ON DELETE SET NULL,
  actor_email   TEXT        NOT NULL DEFAULT '',
  actor_name    TEXT        NOT NULL DEFAULT '',

  -- What happened
  action        TEXT        NOT NULL,  -- e.g. 'enterprise.create'
  resource_type TEXT        NOT NULL DEFAULT '',  -- e.g. 'enterprise', 'user', 'role'
  resource_id   TEXT        NOT NULL DEFAULT '',  -- ID of affected record
  resource_name TEXT        NOT NULL DEFAULT '',  -- Human-readable name

  -- HTTP context
  http_method   TEXT        NOT NULL DEFAULT '',
  http_path     TEXT        NOT NULL DEFAULT '',
  ip_address    TEXT        NOT NULL DEFAULT '',
  user_agent    TEXT        NOT NULL DEFAULT '',

  -- Change diff (JSONB — queryable)
  old_values    JSONB,
  new_values    JSONB,

  -- Result
  status        TEXT        NOT NULL DEFAULT 'success'
                            CHECK (status IN ('success', 'failed')),
  error_message TEXT,

  -- Timestamp (immutable — never updated)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES for fast filtering on the viewer page
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON public.aggregator_audit_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.aggregator_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type
  ON public.aggregator_audit_logs(resource_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.aggregator_audit_logs(created_at DESC);

-- Composite index for common "filter by actor + date range" queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
  ON public.aggregator_audit_logs(actor_id, created_at DESC);

-- ============================================================
-- 3. ROW LEVEL SECURITY — deny all (backend uses service key)
-- ============================================================
ALTER TABLE public.aggregator_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_audit_logs ON public.aggregator_audit_logs;
CREATE POLICY deny_all_audit_logs
  ON public.aggregator_audit_logs
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.aggregator_audit_logs
  IS 'Immutable audit trail. Append-only. Accessible only via backend service role.';

-- ============================================================
-- SCHEMA READY
-- Next: restart backend, then test login → check this table
-- ============================================================
