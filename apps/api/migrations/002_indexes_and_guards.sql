-- EduMotion PostgreSQL Indexes & Append-Only Integrity Guards (Migration 002)

CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth_refresh_tokens(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_question_versions_status_tenant ON question_versions(tenant_id, governance_status);
CREATE INDEX IF NOT EXISTS idx_node_progress_user_status ON user_node_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_journey_nodes_chapter_seq ON journey_nodes(chapter_id, sequence);
CREATE INDEX IF NOT EXISTS idx_competency_evidence_user_comp ON competency_mastery_evidence(user_id, competency_id);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_created ON xp_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user ON assessment_sessions(user_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred ON audit_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON outbox_events(status, occurred_at ASC);

CREATE OR REPLACE FUNCTION prevent_append_only_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'APPEND_ONLY_VIOLATION: Mutating or deleting rows on table % is forbidden', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_xp_ledger_immutable ON xp_ledger;
CREATE TRIGGER trg_xp_ledger_immutable
  BEFORE UPDATE OR DELETE ON xp_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_append_only_mutation();

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_append_only_mutation();
