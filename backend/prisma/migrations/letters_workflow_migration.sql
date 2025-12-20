-- Letters Workflow and Approval Attachments Migration

-- 1. Add new LetterStatus values
ALTER TYPE "LetterStatus" ADD VALUE IF NOT EXISTS 'MGR_APPROVED';
ALTER TYPE "LetterStatus" ADD VALUE IF NOT EXISTS 'MGR_REJECTED';
ALTER TYPE "LetterStatus" ADD VALUE IF NOT EXISTS 'DELAYED';

-- 2. Add workflow columns to letter_requests
ALTER TABLE letter_requests 
ADD COLUMN IF NOT EXISTS current_step "ApprovalStep" DEFAULT 'MANAGER',
ADD COLUMN IF NOT EXISTS manager_approver_id TEXT,
ADD COLUMN IF NOT EXISTS manager_decision "ApprovalDecision" DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS manager_decision_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS manager_notes VARCHAR(500),
ADD COLUMN IF NOT EXISTS manager_attachments JSONB,
ADD COLUMN IF NOT EXISTS hr_approver_id TEXT,
ADD COLUMN IF NOT EXISTS hr_decision "ApprovalDecision" DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS hr_decision_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS hr_decision_notes VARCHAR(500),
ADD COLUMN IF NOT EXISTS hr_attachments JSONB;

-- 3. Add approval attachment columns to leave_requests
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS manager_attachments JSONB,
ADD COLUMN IF NOT EXISTS hr_attachments JSONB;

-- 4. Add new permissions for letters
INSERT INTO permissions (id, code, name, name_en, category, is_active, sort_order, created_at, updated_at)
VALUES 
(gen_random_uuid(), 'LETTERS_APPROVE_MANAGER', 'موافقة الخطابات (مدير)', 'Approve Letters (Manager)', 'الخطابات', true, 0, NOW(), NOW()),
(gen_random_uuid(), 'LETTERS_APPROVE_HR', 'موافقة الخطابات (HR)', 'Approve Letters (HR)', 'الخطابات', true, 0, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
