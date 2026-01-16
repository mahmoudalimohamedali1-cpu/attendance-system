-- ====================================================
-- 🔧 Smart Policy Database Indexes
-- تحسين أداء استعلامات السياسات الذكية
-- ====================================================

-- =====================
-- SmartPolicy Indexes
-- =====================

-- Index for active policies by company (most common query)
CREATE INDEX IF NOT EXISTS "idx_smart_policy_company_active" 
ON "SmartPolicy" ("companyId", "isActive") 
WHERE "isActive" = true;

-- Index for trigger event filtering
CREATE INDEX IF NOT EXISTS "idx_smart_policy_trigger_event" 
ON "SmartPolicy" ("companyId", "triggerEvent", "isActive");

-- Index for status filtering
CREATE INDEX IF NOT EXISTS "idx_smart_policy_status" 
ON "SmartPolicy" ("companyId", "status");

-- Index for effective date range queries
CREATE INDEX IF NOT EXISTS "idx_smart_policy_effective_dates" 
ON "SmartPolicy" ("companyId", "effectiveFrom", "effectiveTo");

-- Index for priority ordering
CREATE INDEX IF NOT EXISTS "idx_smart_policy_priority" 
ON "SmartPolicy" ("companyId", "priority" DESC) 
WHERE "isActive" = true;

-- =====================
-- SmartPolicyExecution Indexes
-- =====================

-- Index for employee execution history
CREATE INDEX IF NOT EXISTS "idx_execution_employee" 
ON "SmartPolicyExecution" ("employeeId", "executedAt" DESC);

-- Index for policy execution history
CREATE INDEX IF NOT EXISTS "idx_execution_policy" 
ON "SmartPolicyExecution" ("policyId", "executedAt" DESC);

-- Index for execution period
CREATE INDEX IF NOT EXISTS "idx_execution_period" 
ON "SmartPolicyExecution" ("companyId", "month", "year");

-- Index for execution result filtering
CREATE INDEX IF NOT EXISTS "idx_execution_result" 
ON "SmartPolicyExecution" ("policyId", "result");

-- =====================
-- SmartPolicyVersion Indexes
-- =====================

-- Index for version history
CREATE INDEX IF NOT EXISTS "idx_version_policy" 
ON "SmartPolicyVersion" ("policyId", "version" DESC);

-- =====================
-- SmartPolicyApproval Indexes
-- =====================

-- Index for pending approvals
CREATE INDEX IF NOT EXISTS "idx_approval_pending" 
ON "SmartPolicyApproval" ("status", "companyId") 
WHERE "status" = 'PENDING';

-- Index for approver history
CREATE INDEX IF NOT EXISTS "idx_approval_approver" 
ON "SmartPolicyApproval" ("approvedBy", "approvedAt" DESC);

-- =====================
-- SmartPolicySimulation Indexes
-- =====================

-- Index for simulation history
CREATE INDEX IF NOT EXISTS "idx_simulation_policy" 
ON "SmartPolicySimulation" ("policyId", "createdAt" DESC);

-- Index for simulation period
CREATE INDEX IF NOT EXISTS "idx_simulation_period" 
ON "SmartPolicySimulation" ("period", "companyId");

-- =====================
-- SmartPolicyException Indexes
-- =====================

-- Index for active exceptions by policy
CREATE INDEX IF NOT EXISTS "idx_exception_policy_active" 
ON "SmartPolicyException" ("policyId", "isActive") 
WHERE "isActive" = true;

-- Index for exception target lookup
CREATE INDEX IF NOT EXISTS "idx_exception_target" 
ON "SmartPolicyException" ("targetType", "targetId");

-- Index for employee exceptions
CREATE INDEX IF NOT EXISTS "idx_exception_employee" 
ON "SmartPolicyException" ("targetType", "targetId") 
WHERE "targetType" = 'EMPLOYEE';

-- =====================
-- OccurrenceTracker Indexes
-- =====================

-- Index for occurrence count queries
CREATE INDEX IF NOT EXISTS "idx_occurrence_employee_type" 
ON "OccurrenceTracker" ("employeeId", "occurrenceType", "count" DESC);

-- Index for policy occurrence tracking
CREATE INDEX IF NOT EXISTS "idx_occurrence_policy" 
ON "OccurrenceTracker" ("policyId", "employeeId");

-- Index for reset period queries
CREATE INDEX IF NOT EXISTS "idx_occurrence_reset" 
ON "OccurrenceTracker" ("lastReset", "resetPeriod");

-- =====================
-- RetroactiveApplication Indexes
-- =====================

-- Index for retro applications by policy
CREATE INDEX IF NOT EXISTS "idx_retro_policy" 
ON "RetroactiveApplication" ("policyId", "status");

-- Index for retro applications by company
CREATE INDEX IF NOT EXISTS "idx_retro_company" 
ON "RetroactiveApplication" ("companyId", "status", "createdAt" DESC);

-- Index for pending retro applications
CREATE INDEX IF NOT EXISTS "idx_retro_pending" 
ON "RetroactiveApplication" ("status", "companyId") 
WHERE "status" = 'PENDING';

-- =====================
-- SmartPolicyAuditLog Indexes
-- =====================

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS "idx_audit_policy" 
ON "SmartPolicyAuditLog" ("policyId", "createdAt" DESC);

-- Index for user activity
CREATE INDEX IF NOT EXISTS "idx_audit_user" 
ON "SmartPolicyAuditLog" ("userId", "createdAt" DESC);

-- Index for action type filtering
CREATE INDEX IF NOT EXISTS "idx_audit_action" 
ON "SmartPolicyAuditLog" ("action", "companyId", "createdAt" DESC);

-- =====================
-- PolicyTemplate Indexes
-- =====================

-- Index for template search
CREATE INDEX IF NOT EXISTS "idx_template_category" 
ON "PolicyTemplate" ("category", "isPublic");

-- Index for template popularity
CREATE INDEX IF NOT EXISTS "idx_template_usage" 
ON "PolicyTemplate" ("usageCount" DESC);

-- =====================
-- Composite Indexes for Common Queries
-- =====================

-- Most common policy lookup
CREATE INDEX IF NOT EXISTS "idx_policy_common_lookup" 
ON "SmartPolicy" ("companyId", "isActive", "triggerEvent", "priority" DESC);

-- Execution analytics
CREATE INDEX IF NOT EXISTS "idx_execution_analytics" 
ON "SmartPolicyExecution" ("companyId", "executedAt", "result");

-- =====================
-- Partial Indexes for Performance
-- =====================

-- Only active policies
CREATE INDEX IF NOT EXISTS "idx_active_policies_only" 
ON "SmartPolicy" ("companyId", "triggerEvent")
WHERE "isActive" = true AND "status" = 'ACTIVE';

-- Only pending approvals
CREATE INDEX IF NOT EXISTS "idx_pending_approvals_only"
ON "SmartPolicyApproval" ("companyId", "createdAt")
WHERE "status" = 'PENDING';

-- =====================
-- GIN Indexes for JSONB columns
-- =====================

-- Index for parsedPolicy JSONB search (if using PostgreSQL)
CREATE INDEX IF NOT EXISTS "idx_policy_parsed_gin" 
ON "SmartPolicy" USING GIN ("parsedPolicy" jsonb_path_ops);

-- Index for conditions JSONB search
CREATE INDEX IF NOT EXISTS "idx_policy_conditions_gin" 
ON "SmartPolicy" USING GIN (("parsedPolicy"->'conditions'));

-- =====================
-- Text Search Indexes
-- =====================

-- Full text search on policy name and original text
CREATE INDEX IF NOT EXISTS "idx_policy_text_search" 
ON "SmartPolicy" USING GIN (to_tsvector('arabic', COALESCE("name", '') || ' ' || COALESCE("originalText", '')));

-- =====================
-- BRIN Indexes for Time-Series Data
-- =====================

-- BRIN index for execution timestamp (efficient for large tables)
CREATE INDEX IF NOT EXISTS "idx_execution_time_brin" 
ON "SmartPolicyExecution" USING BRIN ("executedAt");

-- BRIN index for audit log timestamp
CREATE INDEX IF NOT EXISTS "idx_audit_time_brin" 
ON "SmartPolicyAuditLog" USING BRIN ("createdAt");

-- ====================================================
-- Notes:
-- 1. Run these indexes during low-traffic periods
-- 2. Monitor query performance before and after
-- 3. Some indexes may need to be adjusted based on actual query patterns
-- 4. The GIN and BRIN indexes require PostgreSQL
-- 5. For MySQL, replace GIN with appropriate index type
-- ====================================================
