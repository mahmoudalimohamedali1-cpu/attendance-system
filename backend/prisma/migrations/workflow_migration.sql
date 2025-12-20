-- Create ApprovalStep enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApprovalStep') THEN
        CREATE TYPE "ApprovalStep" AS ENUM ('MANAGER', 'HR', 'COMPLETED');
    END IF;
END
$$;

-- Create ApprovalDecision enum  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApprovalDecision') THEN
        CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELAYED');
    END IF;
END
$$;

-- Add new values to LeaveStatus
ALTER TYPE "LeaveStatus" ADD VALUE IF NOT EXISTS 'MGR_APPROVED';
ALTER TYPE "LeaveStatus" ADD VALUE IF NOT EXISTS 'MGR_REJECTED';
ALTER TYPE "LeaveStatus" ADD VALUE IF NOT EXISTS 'DELAYED';

-- Add workflow columns to leave_requests
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS current_step "ApprovalStep" DEFAULT 'MANAGER',
ADD COLUMN IF NOT EXISTS manager_approver_id TEXT,
ADD COLUMN IF NOT EXISTS manager_decision "ApprovalDecision" DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS manager_decision_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS manager_notes VARCHAR(500),
ADD COLUMN IF NOT EXISTS hr_approver_id TEXT,
ADD COLUMN IF NOT EXISTS hr_decision "ApprovalDecision" DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS hr_decision_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS hr_decision_notes VARCHAR(500);

-- Create approval_logs table
CREATE TABLE IF NOT EXISTS approval_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    request_type VARCHAR(50) NOT NULL,
    request_id TEXT NOT NULL,
    step VARCHAR(50) NOT NULL,
    decision VARCHAR(50) NOT NULL,
    notes VARCHAR(500),
    by_user_id TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_logs_request ON approval_logs(request_type, request_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_user ON approval_logs(by_user_id);

-- Add new permissions
INSERT INTO permissions (id, code, name, name_en, category, is_active, sort_order, created_at, updated_at)
VALUES 
(gen_random_uuid(), 'LEAVES_APPROVE_MANAGER', 'موافقة الإجازات (مدير)', 'Approve Leaves (Manager)', 'الإجازات', true, 0, NOW(), NOW()),
(gen_random_uuid(), 'LEAVES_APPROVE_HR', 'موافقة الإجازات (HR)', 'Approve Leaves (HR)', 'الإجازات', true, 0, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
