/*
  Warnings:

  - The values [WORK_FROM_HOME] on the enum `LeaveType` will be removed. If these variants are still used in the database, this will fail.
  - The values [REQUEST,COMPLAINT,CERTIFICATION] on the enum `LetterType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `end_time` on the `leave_requests` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `leave_requests` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[company_id,name]` on the table `branches` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[company_id,name]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key,company_id]` on the table `system_settings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[national_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[gosi_number]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[company_id,employee_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('PERMANENT', 'FIXED_TERM', 'PART_TIME', 'SEASONAL', 'PROBATION');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_EMPLOYEE', 'PENDING_EMPLOYER', 'PENDING_QIWA', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QiwaAuthStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'AUTHENTICATED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalStep" AS ENUM ('MANAGER', 'HR', 'FINANCE', 'CEO', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELAYED');

-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('SELF', 'TEAM', 'BRANCH', 'DEPARTMENT', 'ALL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PermissionAuditAction" AS ENUM ('ADDED', 'REMOVED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "RaiseType" AS ENUM ('SALARY_INCREASE', 'ANNUAL_LEAVE_BONUS', 'BUSINESS_TRIP', 'BONUS', 'ALLOWANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "RaiseStatus" AS ENUM ('PENDING', 'MGR_APPROVED', 'MGR_REJECTED', 'APPROVED', 'REJECTED', 'DELAYED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdvanceType" AS ENUM ('BANK_TRANSFER', 'CASH');

-- CreateEnum
CREATE TYPE "SalaryComponentType" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "SalaryComponentNature" AS ENUM ('FIXED', 'VARIABLE', 'FORMULA');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'INPUTS_COLLECTED', 'CALCULATED', 'HR_REVIEWED', 'FINANCE_APPROVED', 'LOCKED', 'PAID', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PayslipLineSource" AS ENUM ('STRUCTURE', 'POLICY', 'MANUAL', 'ADJUSTMENT', 'STATUTORY');

-- CreateEnum
CREATE TYPE "RetroPayStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('OVERTIME', 'LEAVE', 'DEDUCTION', 'ALLOWANCE', 'ATTENDANCE', 'GENERAL');

-- CreateEnum
CREATE TYPE "PolicyScope" AS ENUM ('COMPANY', 'BRANCH', 'DEPARTMENT', 'JOB_TITLE', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "OutputSign" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "MudadStatus" AS ENUM ('PENDING', 'PREPARED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'RESUBMITTED', 'RESUBMIT_REQUIRED');

-- CreateEnum
CREATE TYPE "WpsStatus" AS ENUM ('GENERATED', 'DOWNLOADED', 'SUBMITTED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditModule" AS ENUM ('AUTH', 'USER', 'PAYROLL', 'PAYSLIP', 'BANK_ACCOUNT', 'SALARY', 'LEAVE', 'ATTENDANCE', 'ADVANCE', 'GOSI', 'EOS', 'PERMISSION', 'POLICY', 'RETRO_PAY', 'LETTER', 'SETTINGS', 'MUDAD', 'WPS', 'CONTRACT', 'DISCIPLINARY');

-- CreateEnum
CREATE TYPE "DisciplinaryStage" AS ENUM ('MANAGER_REQUEST', 'HR_INITIAL_REVIEW', 'EMPLOYEE_INFORMAL_RESPONSE', 'OFFICIAL_INVESTIGATION', 'DECISION', 'OBJECTION', 'FINAL');

-- CreateEnum
CREATE TYPE "DisciplinaryStatus" AS ENUM ('SUBMITTED_TO_HR', 'HR_REJECTED', 'HR_INFORMAL_SENT', 'AWAITING_EMPLOYEE_INFORMAL', 'EMPLOYEE_REJECTED_INFORMAL', 'OFFICIAL_INVESTIGATION_OPENED', 'HEARING_SCHEDULED', 'INVESTIGATION_IN_PROGRESS', 'AWAITING_HR_DECISION', 'DECISION_ISSUED', 'AWAITING_EMPLOYEE_ACK', 'EMPLOYEE_OBJECTED', 'HR_REVIEWING_OBJECTION', 'FINALIZED_APPROVED', 'FINALIZED_CANCELLED', 'FINALIZED_CONTINUE_INVESTIGATION');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('NO_VIOLATION', 'NOTICE', 'WARNING', 'FIRST_WARNING', 'SECOND_WARNING', 'FINAL_WARNING_TERMINATION', 'FINAL_TERMINATION_ART80', 'PROMOTION_DELAY', 'SALARY_DEDUCTION', 'SUSPENSION_WITH_PAY', 'SUSPENSION_WITHOUT_PAY');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentStatus" AS ENUM ('PENDING', 'POSTED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdjustmentUnit" AS ENUM ('DAYS', 'HOURS', 'AMOUNT');

-- CreateEnum
CREATE TYPE "CaseEventType" AS ENUM ('CASE_CREATED', 'HR_INITIAL_REVIEW', 'INFORMAL_ACTION_SENT', 'EMPLOYEE_INFORMAL_RESPONSE', 'OFFICIAL_INVESTIGATION_OPENED', 'HEARING_SCHEDULED', 'MINUTES_UPLOADED', 'DECISION_ISSUED', 'EMPLOYEE_ACKNOWLEDGED', 'EMPLOYEE_OBJECTED', 'OBJECTION_REVIEWED', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeductionBasePolicy" AS ENUM ('BASIC_ONLY', 'BASIC_FIXED', 'GROSS');

-- CreateEnum
CREATE TYPE "SubmissionEntityType" AS ENUM ('MUDAD', 'WPS', 'QIWA');

-- CreateEnum
CREATE TYPE "ApprovalRequestType" AS ENUM ('LEAVE', 'ADVANCE', 'RAISE', 'PAYROLL', 'WPS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeaveStatus" ADD VALUE 'MGR_APPROVED';
ALTER TYPE "LeaveStatus" ADD VALUE 'MGR_REJECTED';
ALTER TYPE "LeaveStatus" ADD VALUE 'MODIFIED';
ALTER TYPE "LeaveStatus" ADD VALUE 'DELAYED';

-- AlterEnum
BEGIN;
CREATE TYPE "LeaveType_new" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'EMERGENCY', 'NEW_BABY', 'MARRIAGE', 'BEREAVEMENT', 'HAJJ', 'EXAM', 'WORK_MISSION', 'UNPAID', 'EARLY_LEAVE', 'OTHER');
ALTER TABLE "leave_requests" ALTER COLUMN "type" TYPE "LeaveType_new" USING ("type"::text::"LeaveType_new");
ALTER TYPE "LeaveType" RENAME TO "LeaveType_old";
ALTER TYPE "LeaveType_new" RENAME TO "LeaveType";
DROP TYPE "LeaveType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LetterStatus" ADD VALUE 'MGR_APPROVED';
ALTER TYPE "LetterStatus" ADD VALUE 'MGR_REJECTED';
ALTER TYPE "LetterStatus" ADD VALUE 'DELAYED';

-- AlterEnum
BEGIN;
CREATE TYPE "LetterType_new" AS ENUM ('SALARY_DEFINITION', 'SERVICE_CONFIRMATION', 'SALARY_ADJUSTMENT', 'PROMOTION', 'TRANSFER_ASSIGNMENT', 'RESIGNATION', 'TERMINATION', 'CLEARANCE', 'EXPERIENCE', 'SALARY_DEFINITION_DIRECTED', 'NOC', 'DELEGATION');
ALTER TABLE "letter_requests" ALTER COLUMN "type" TYPE "LetterType_new" USING ("type"::text::"LetterType_new");
ALTER TYPE "LetterType" RENAME TO "LetterType_old";
ALTER TYPE "LetterType_new" RENAME TO "LetterType";
DROP TYPE "LetterType_old";
COMMIT;

-- DropIndex
DROP INDEX "letter_requests_approver_id_idx";

-- DropIndex
DROP INDEX "letter_requests_status_idx";

-- DropIndex
DROP INDEX "letter_requests_user_id_idx";

-- DropIndex
DROP INDEX "system_settings_key_key";

-- DropIndex
DROP INDEX "users_employee_code_key";

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "company_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'ABSENT';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "holidays" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "leave_requests" DROP COLUMN "end_time",
DROP COLUMN "start_time",
ADD COLUMN     "approved_days" INTEGER,
ADD COLUMN     "attachments" JSONB,
ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "current_step" "ApprovalStep" NOT NULL DEFAULT 'MANAGER',
ADD COLUMN     "hr_approver_id" TEXT,
ADD COLUMN     "hr_attachments" JSONB,
ADD COLUMN     "hr_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "hr_decision_at" TIMESTAMP(3),
ADD COLUMN     "hr_decision_notes" VARCHAR(500),
ADD COLUMN     "manager_approver_id" TEXT,
ADD COLUMN     "manager_attachments" JSONB,
ADD COLUMN     "manager_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "manager_decision_at" TIMESTAMP(3),
ADD COLUMN     "manager_notes" VARCHAR(500),
ADD COLUMN     "notes" VARCHAR(500),
ADD COLUMN     "requested_days" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "letter_requests" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "current_step" "ApprovalStep" NOT NULL DEFAULT 'MANAGER',
ADD COLUMN     "hr_approver_id" TEXT,
ADD COLUMN     "hr_attachments" JSONB,
ADD COLUMN     "hr_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "hr_decision_at" TIMESTAMP(3),
ADD COLUMN     "hr_decision_notes" VARCHAR(500),
ADD COLUMN     "manager_approver_id" TEXT,
ADD COLUMN     "manager_attachments" JSONB,
ADD COLUMN     "manager_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "manager_decision_at" TIMESTAMP(3),
ADD COLUMN     "manager_notes" VARCHAR(500);

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "suspicious_attempts" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "annual_leave_days" INTEGER NOT NULL DEFAULT 21,
ADD COLUMN     "border_number" TEXT,
ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "cost_center_id" TEXT,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "gosi_number" TEXT,
ADD COLUMN     "iqama_expiry_date" DATE,
ADD COLUMN     "iqama_number" TEXT,
ADD COLUMN     "is_saudi" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "job_title_id" TEXT,
ADD COLUMN     "marital_status" TEXT,
ADD COLUMN     "national_id" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "passport_expiry_date" DATE,
ADD COLUMN     "passport_number" TEXT,
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "profession_code" TEXT,
ADD COLUMN     "remaining_leave_days" INTEGER NOT NULL DEFAULT 21,
ADD COLUMN     "used_leave_days" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "work_from_home" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "work_schedules" ADD COLUMN     "company_id" TEXT;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "cr_number" TEXT,
    "tax_id" TEXT,
    "logo" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_titles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "level" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "is_direct_manager" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "requires_permission" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "company_id" TEXT,
    "scope" "PermissionScope" NOT NULL DEFAULT 'SELF',
    "branch_id" TEXT,
    "department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permission_employees" (
    "id" TEXT NOT NULL,
    "user_permission_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permission_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_title_permissions" (
    "id" TEXT NOT NULL,
    "job_title_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "scope" "PermissionScope" NOT NULL DEFAULT 'TEAM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_title_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_audit_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "performed_by_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "target_user_name" TEXT NOT NULL,
    "action" "PermissionAuditAction" NOT NULL,
    "permission_code" TEXT NOT NULL,
    "permission_name" TEXT NOT NULL,
    "scope" "PermissionScope",
    "scope_details" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "request_type" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "notes" VARCHAR(500),
    "by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raise_requests" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "user_id" TEXT NOT NULL,
    "type" "RaiseType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "effective_month" DATE NOT NULL,
    "notes" VARCHAR(200),
    "attachments" JSONB,
    "status" "RaiseStatus" NOT NULL DEFAULT 'PENDING',
    "current_step" "ApprovalStep" NOT NULL DEFAULT 'MANAGER',
    "manager_approver_id" TEXT,
    "manager_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "manager_decision_at" TIMESTAMP(3),
    "manager_notes" VARCHAR(500),
    "manager_attachments" JSONB,
    "hr_approver_id" TEXT,
    "hr_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "hr_decision_at" TIMESTAMP(3),
    "hr_decision_notes" VARCHAR(500),
    "hr_attachments" JSONB,
    "finance_approver_id" TEXT,
    "finance_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "finance_decision_at" TIMESTAMP(3),
    "finance_decision_notes" VARCHAR(500),
    "ceo_approver_id" TEXT,
    "ceo_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "ceo_decision_at" TIMESTAMP(3),
    "ceo_decision_notes" VARCHAR(500),
    "approval_chain" JSONB,
    "applied_to_salary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raise_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advance_requests" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "user_id" TEXT NOT NULL,
    "type" "AdvanceType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "period_months" INTEGER NOT NULL,
    "monthly_deduction" DECIMAL(10,2) NOT NULL,
    "notes" VARCHAR(500),
    "attachments" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "current_step" "ApprovalStep" NOT NULL DEFAULT 'MANAGER',
    "manager_approver_id" TEXT,
    "manager_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "manager_decision_at" TIMESTAMP(3),
    "manager_notes" VARCHAR(500),
    "hr_approver_id" TEXT,
    "hr_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "hr_decision_at" TIMESTAMP(3),
    "hr_decision_notes" VARCHAR(500),
    "approved_amount" DECIMAL(10,2),
    "approved_monthly_deduction" DECIMAL(10,2),
    "finance_approver_id" TEXT,
    "finance_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "finance_decision_at" TIMESTAMP(3),
    "finance_decision_notes" VARCHAR(500),
    "ceo_approver_id" TEXT,
    "ceo_decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "ceo_decision_at" TIMESTAMP(3),
    "ceo_decision_notes" VARCHAR(500),
    "approval_chain" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_payments" (
    "id" TEXT NOT NULL,
    "advance_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_type" TEXT NOT NULL DEFAULT 'SALARY_DEDUCTION',
    "payroll_run_id" TEXT,
    "payslip_id" TEXT,
    "notes" VARCHAR(500),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_bank_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "account_holder_name" TEXT,
    "bank_name" TEXT NOT NULL,
    "bank_code" TEXT,
    "swift_code" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_bank_accounts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "swift_code" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mol_id" TEXT,
    "wps_participant" TEXT,
    "account_type" TEXT NOT NULL DEFAULT 'CURRENT',
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contract_number" TEXT,
    "type" "ContractType" NOT NULL DEFAULT 'PERMANENT',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "probation_end_date" DATE,
    "terminated_at" TIMESTAMP(3),
    "termination_reason" TEXT,
    "terminated_by" TEXT,
    "renewal_count" INTEGER NOT NULL DEFAULT 0,
    "previous_contract_id" TEXT,
    "salary_cycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "basic_salary" DECIMAL(10,2),
    "housing_allowance" DECIMAL(10,2),
    "transport_allowance" DECIMAL(10,2),
    "other_allowances" DECIMAL(10,2),
    "total_salary" DECIMAL(10,2),
    "contract_job_title" TEXT,
    "work_location" TEXT,
    "working_hours_per_week" INTEGER NOT NULL DEFAULT 48,
    "annual_leave_days" INTEGER NOT NULL DEFAULT 21,
    "notice_period_days" INTEGER NOT NULL DEFAULT 30,
    "employee_signature" BOOLEAN NOT NULL DEFAULT false,
    "employee_signed_at" TIMESTAMP(3),
    "employer_signature" BOOLEAN NOT NULL DEFAULT false,
    "employer_signed_at" TIMESTAMP(3),
    "signed_by_user_id" TEXT,
    "qiwa_contract_id" TEXT,
    "qiwa_status" "QiwaAuthStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "qiwa_auth_date" TIMESTAMP(3),
    "qiwa_reject_reason" TEXT,
    "qiwa_last_sync" TIMESTAMP(3),
    "document_url" TEXT,
    "additional_terms" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_components" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT,
    "type" "SalaryComponentType" NOT NULL,
    "nature" "SalaryComponentNature" NOT NULL DEFAULT 'FIXED',
    "description" TEXT,
    "gosi_eligible" BOOLEAN NOT NULL DEFAULT false,
    "ot_eligible" BOOLEAN NOT NULL DEFAULT false,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "formula" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "rounding_mode" TEXT NOT NULL DEFAULT 'ROUND',
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structures" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structure_lines" (
    "id" TEXT NOT NULL,
    "structure_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "percentage" DECIMAL(5,2),
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "salary_structure_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_salary_assignments" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "structure_id" TEXT NOT NULL,
    "base_salary" DECIMAL(10,2) NOT NULL,
    "effective_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_salary_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_lines" (
    "id" TEXT NOT NULL,
    "payslip_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "sign" TEXT NOT NULL DEFAULT 'EARNING',
    "amount" DECIMAL(10,2) NOT NULL,
    "source_type" "PayslipLineSource" NOT NULL DEFAULT 'STRUCTURE',
    "source_ref" TEXT,
    "description_ar" TEXT,
    "units" DECIMAL(10,2),
    "rate" DECIMAL(10,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslip_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "cut_off_date" DATE,
    "inputs_locked_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "period_id" TEXT NOT NULL,
    "run_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "processed_by" TEXT,
    "is_adjustment" BOOLEAN NOT NULL DEFAULT false,
    "original_run_id" TEXT,
    "adjustment_reason" TEXT,
    "calculated_at" TIMESTAMP(3),
    "calculated_by" TEXT,
    "hr_approved_at" TIMESTAMP(3),
    "hr_approved_by" TEXT,
    "finance_approved_at" TIMESTAMP(3),
    "finance_approved_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "employee_id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "run_id" TEXT,
    "base_salary" DECIMAL(10,2) NOT NULL,
    "gross_salary" DECIMAL(10,2) NOT NULL,
    "total_deductions" DECIMAL(10,2) NOT NULL,
    "net_salary" DECIMAL(10,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "calculation_trace" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gosi_configs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" DATE,
    "employee_rate" DECIMAL(5,2) NOT NULL,
    "employer_rate" DECIMAL(5,2) NOT NULL,
    "saned_rate" DECIMAL(5,2) NOT NULL,
    "hazard_rate" DECIMAL(5,2) NOT NULL,
    "max_cap_amount" DECIMAL(10,2) NOT NULL DEFAULT 45000,
    "min_base_salary" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_saudi_only" BOOLEAN NOT NULL DEFAULT true,
    "include_allowances" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gosi_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retro_pays" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "employee_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3) NOT NULL,
    "old_amount" DECIMAL(10,2) NOT NULL,
    "new_amount" DECIMAL(10,2) NOT NULL,
    "difference" DECIMAL(10,2) NOT NULL,
    "months_count" INTEGER NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" "RetroPayStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_by_id" TEXT,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retro_pays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT,
    "description" TEXT,
    "type" "PolicyType" NOT NULL,
    "scope" "PolicyScope" NOT NULL DEFAULT 'COMPANY',
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "branch_id" TEXT,
    "department_id" TEXT,
    "job_title_id" TEXT,
    "employee_id" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "scope_rank" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_rules" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "value_type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "output_component_id" TEXT,
    "output_sign" "OutputSign" NOT NULL DEFAULT 'EARNING',
    "rule_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mudad_submissions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "payroll_run_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "submission_type" TEXT NOT NULL DEFAULT 'SALARY',
    "status" "MudadStatus" NOT NULL DEFAULT 'PENDING',
    "wps_file_url" TEXT,
    "mudad_ref" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "employee_count" INTEGER NOT NULL,
    "prepared_at" TIMESTAMP(3),
    "prepared_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "submitted_by" TEXT,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_note" TEXT,
    "file_hash_sha256" VARCHAR(64),
    "file_size" INTEGER,
    "generator_version" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mudad_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wps_submissions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "payroll_run_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_format" TEXT NOT NULL DEFAULT 'WPS',
    "file_url" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "employee_count" INTEGER NOT NULL,
    "status" "WpsStatus" NOT NULL DEFAULT 'GENERATED',
    "bank_name" TEXT,
    "bank_ref" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT,
    "downloaded_at" TIMESTAMP(3),
    "downloaded_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "submitted_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "attachment_url" TEXT,
    "file_hash_sha256" VARCHAR(64),
    "generator_version" TEXT,
    "notes" TEXT,
    "errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wps_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_disciplinary_policies" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "incident_max_age_days" INTEGER NOT NULL DEFAULT 30,
    "decision_deadline_days" INTEGER NOT NULL DEFAULT 30,
    "objection_window_days" INTEGER NOT NULL DEFAULT 15,
    "allow_retrospective_incidents" BOOLEAN NOT NULL DEFAULT false,
    "auto_apply_to_open_payroll_period" BOOLEAN NOT NULL DEFAULT true,
    "deduction_base_policy" "DeductionBasePolicy" NOT NULL DEFAULT 'BASIC_FIXED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_disciplinary_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinary_cases" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "case_code" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "incident_date" TIMESTAMP(3) NOT NULL,
    "incident_location" TEXT NOT NULL,
    "involved_parties" JSONB,
    "description" TEXT NOT NULL,
    "status" "DisciplinaryStatus" NOT NULL DEFAULT 'SUBMITTED_TO_HR',
    "stage" "DisciplinaryStage" NOT NULL DEFAULT 'MANAGER_REQUEST',
    "incident_max_age_days_snapshot" INTEGER NOT NULL,
    "decision_deadline_days_snapshot" INTEGER NOT NULL,
    "objection_window_days_snapshot" INTEGER NOT NULL,
    "allow_retrospective_snapshot" BOOLEAN NOT NULL,
    "deduction_base_policy_snapshot" "DeductionBasePolicy" NOT NULL,
    "is_retrospective" BOOLEAN NOT NULL DEFAULT false,
    "retrospective_reason" TEXT,
    "hr_initial_action" TEXT,
    "hr_initial_reason" TEXT,
    "official_investigation_opened_at" TIMESTAMP(3),
    "hearing_datetime" TIMESTAMP(3),
    "hearing_location" TEXT,
    "decision_type" "DecisionType",
    "decision_reason" TEXT,
    "decision_created_at" TIMESTAMP(3),
    "penalty_unit" "AdjustmentUnit",
    "penalty_value" DECIMAL(10,2),
    "penalty_effective_date" DATE,
    "payroll_period_id" TEXT,
    "employee_ack_status" TEXT,
    "employee_ack_at" TIMESTAMP(3),
    "objection_text" TEXT,
    "objection_submitted_at" TIMESTAMP(3),
    "hr_after_objection_action" TEXT,
    "hr_after_objection_reason" TEXT,
    "finalized_at" TIMESTAMP(3),
    "legal_hold" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disciplinary_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_events" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "event_type" "CaseEventType" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_attachments" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "uploader_user_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_minutes" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "session_no" INTEGER NOT NULL,
    "minutes_text" TEXT,
    "minutes_file_url" TEXT,
    "created_by_hr_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_minutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_disciplinary_records" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "decision_type" "DecisionType" NOT NULL,
    "reason" TEXT,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "penalty_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_disciplinary_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_adjustments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "payroll_period_id" TEXT NOT NULL,
    "adjustment_type" TEXT NOT NULL,
    "unit" "AdjustmentUnit" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2),
    "status" "PayrollAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "effective_date" DATE,
    "posted_at" TIMESTAMP(3),
    "reversed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_status_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "entity_type" "SubmissionEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "changed_by_user_id" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "external_ref" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_chain_configs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "request_type" "ApprovalRequestType" NOT NULL,
    "min_amount" DECIMAL(12,2),
    "max_amount" DECIMAL(12,2),
    "min_days" INTEGER,
    "max_days" INTEGER,
    "chain" JSONB NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_chain_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_cr_number_key" ON "companies"("cr_number");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tax_id_key" ON "companies"("tax_id");

-- CreateIndex
CREATE INDEX "job_titles_company_id_is_active_idx" ON "job_titles"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "job_titles_company_id_name_key" ON "job_titles"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_category_idx" ON "permissions"("category");

-- CreateIndex
CREATE INDEX "permissions_code_idx" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");

-- CreateIndex
CREATE INDEX "user_permissions_permission_id_idx" ON "user_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "user_permissions_user_id_permission_id_idx" ON "user_permissions"("user_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_permissions_scope_branch_id_idx" ON "user_permissions"("scope", "branch_id");

-- CreateIndex
CREATE INDEX "user_permissions_scope_department_id_idx" ON "user_permissions"("scope", "department_id");

-- CreateIndex
CREATE INDEX "user_permissions_company_id_idx" ON "user_permissions"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_permission_id_scope_branch_id_depa_key" ON "user_permissions"("user_id", "permission_id", "scope", "branch_id", "department_id");

-- CreateIndex
CREATE INDEX "user_permission_employees_user_permission_id_idx" ON "user_permission_employees"("user_permission_id");

-- CreateIndex
CREATE INDEX "user_permission_employees_employee_id_idx" ON "user_permission_employees"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_employees_user_permission_id_employee_id_key" ON "user_permission_employees"("user_permission_id", "employee_id");

-- CreateIndex
CREATE INDEX "job_title_permissions_job_title_id_idx" ON "job_title_permissions"("job_title_id");

-- CreateIndex
CREATE INDEX "job_title_permissions_permission_id_idx" ON "job_title_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_title_permissions_job_title_id_permission_id_key" ON "job_title_permissions"("job_title_id", "permission_id");

-- CreateIndex
CREATE INDEX "permission_audit_logs_performed_by_id_idx" ON "permission_audit_logs"("performed_by_id");

-- CreateIndex
CREATE INDEX "permission_audit_logs_target_user_id_idx" ON "permission_audit_logs"("target_user_id");

-- CreateIndex
CREATE INDEX "permission_audit_logs_created_at_idx" ON "permission_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "permission_audit_logs_permission_code_idx" ON "permission_audit_logs"("permission_code");

-- CreateIndex
CREATE INDEX "approval_logs_request_type_request_id_idx" ON "approval_logs"("request_type", "request_id");

-- CreateIndex
CREATE INDEX "approval_logs_by_user_id_idx" ON "approval_logs"("by_user_id");

-- CreateIndex
CREATE INDEX "raise_requests_user_id_status_idx" ON "raise_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "raise_requests_status_created_at_idx" ON "raise_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "advance_requests_user_id_status_idx" ON "advance_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "advance_requests_status_created_at_idx" ON "advance_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "loan_payments_advance_id_idx" ON "loan_payments"("advance_id");

-- CreateIndex
CREATE INDEX "loan_payments_payment_date_idx" ON "loan_payments"("payment_date");

-- CreateIndex
CREATE INDEX "employee_bank_accounts_user_id_is_primary_idx" ON "employee_bank_accounts"("user_id", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "employee_bank_accounts_user_id_iban_key" ON "employee_bank_accounts"("user_id", "iban");

-- CreateIndex
CREATE INDEX "company_bank_accounts_company_id_is_primary_idx" ON "company_bank_accounts"("company_id", "is_primary");

-- CreateIndex
CREATE INDEX "company_bank_accounts_company_id_is_active_idx" ON "company_bank_accounts"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "company_bank_accounts_company_id_iban_key" ON "company_bank_accounts"("company_id", "iban");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_qiwa_contract_id_key" ON "contracts"("qiwa_contract_id");

-- CreateIndex
CREATE INDEX "contracts_user_id_status_idx" ON "contracts"("user_id", "status");

-- CreateIndex
CREATE INDEX "contracts_end_date_idx" ON "contracts"("end_date");

-- CreateIndex
CREATE INDEX "contracts_qiwa_status_idx" ON "contracts"("qiwa_status");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_code_key" ON "cost_centers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_company_id_code_key" ON "cost_centers"("company_id", "code");

-- CreateIndex
CREATE INDEX "salary_components_company_id_is_active_idx" ON "salary_components"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "salary_components_effective_date_end_date_idx" ON "salary_components"("effective_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "salary_components_company_id_type_code_version_key" ON "salary_components"("company_id", "type", "code", "version");

-- CreateIndex
CREATE INDEX "salary_structures_company_id_is_active_idx" ON "salary_structures"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "salary_structures_effective_date_end_date_idx" ON "salary_structures"("effective_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "salary_structures_company_id_name_version_key" ON "salary_structures"("company_id", "name", "version");

-- CreateIndex
CREATE INDEX "payslip_lines_payslip_id_source_type_idx" ON "payslip_lines"("payslip_id", "source_type");

-- CreateIndex
CREATE INDEX "payslip_lines_payslip_id_component_id_idx" ON "payslip_lines"("payslip_id", "component_id");

-- CreateIndex
CREATE INDEX "payroll_periods_company_id_status_idx" ON "payroll_periods"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_company_id_month_year_key" ON "payroll_periods"("company_id", "month", "year");

-- CreateIndex
CREATE INDEX "payroll_runs_company_id_status_idx" ON "payroll_runs"("company_id", "status");

-- CreateIndex
CREATE INDEX "payroll_runs_period_id_idx" ON "payroll_runs"("period_id");

-- CreateIndex
CREATE INDEX "payroll_runs_original_run_id_idx" ON "payroll_runs"("original_run_id");

-- CreateIndex
CREATE INDEX "gosi_configs_company_id_is_active_idx" ON "gosi_configs"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "gosi_configs_effective_date_end_date_idx" ON "gosi_configs"("effective_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "gosi_configs_company_id_version_key" ON "gosi_configs"("company_id", "version");

-- CreateIndex
CREATE INDEX "policies_company_id_type_scope_effective_from_idx" ON "policies"("company_id", "type", "scope", "effective_from");

-- CreateIndex
CREATE INDEX "policies_type_scope_is_active_idx" ON "policies"("type", "scope", "is_active");

-- CreateIndex
CREATE INDEX "policies_effective_from_effective_to_idx" ON "policies"("effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "policies_branch_id_idx" ON "policies"("branch_id");

-- CreateIndex
CREATE INDEX "policies_department_id_idx" ON "policies"("department_id");

-- CreateIndex
CREATE INDEX "policies_job_title_id_idx" ON "policies"("job_title_id");

-- CreateIndex
CREATE INDEX "policies_employee_id_idx" ON "policies"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "policies_company_id_code_key" ON "policies"("company_id", "code");

-- CreateIndex
CREATE INDEX "policy_rules_policy_id_is_active_rule_order_idx" ON "policy_rules"("policy_id", "is_active", "rule_order");

-- CreateIndex
CREATE INDEX "policy_rules_output_component_id_idx" ON "policy_rules"("output_component_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_rules_policy_id_code_key" ON "policy_rules"("policy_id", "code");

-- CreateIndex
CREATE INDEX "mudad_submissions_company_id_period_idx" ON "mudad_submissions"("company_id", "period");

-- CreateIndex
CREATE INDEX "mudad_submissions_status_idx" ON "mudad_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mudad_submissions_payroll_run_id_submission_type_key" ON "mudad_submissions"("payroll_run_id", "submission_type");

-- CreateIndex
CREATE INDEX "wps_submissions_company_id_status_idx" ON "wps_submissions"("company_id", "status");

-- CreateIndex
CREATE INDEX "wps_submissions_payroll_run_id_idx" ON "wps_submissions"("payroll_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_disciplinary_policies_company_id_key" ON "company_disciplinary_policies"("company_id");

-- CreateIndex
CREATE INDEX "disciplinary_cases_company_id_status_idx" ON "disciplinary_cases"("company_id", "status");

-- CreateIndex
CREATE INDEX "disciplinary_cases_employee_id_idx" ON "disciplinary_cases"("employee_id");

-- CreateIndex
CREATE INDEX "disciplinary_cases_company_id_employee_id_idx" ON "disciplinary_cases"("company_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "disciplinary_cases_company_id_case_code_key" ON "disciplinary_cases"("company_id", "case_code");

-- CreateIndex
CREATE INDEX "case_events_case_id_created_at_idx" ON "case_events"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "payroll_adjustments_employee_id_payroll_period_id_idx" ON "payroll_adjustments"("employee_id", "payroll_period_id");

-- CreateIndex
CREATE INDEX "payroll_adjustments_payroll_period_id_status_idx" ON "payroll_adjustments"("payroll_period_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_adjustments_company_id_case_id_key" ON "payroll_adjustments"("company_id", "case_id");

-- CreateIndex
CREATE INDEX "submission_status_logs_company_id_entity_type_entity_id_idx" ON "submission_status_logs"("company_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "submission_status_logs_changed_at_idx" ON "submission_status_logs"("changed_at");

-- CreateIndex
CREATE INDEX "approval_chain_configs_company_id_request_type_is_active_idx" ON "approval_chain_configs"("company_id", "request_type", "is_active");

-- CreateIndex
CREATE INDEX "attendances_company_id_date_idx" ON "attendances"("company_id", "date");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "branches_company_id_name_key" ON "branches"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_company_id_name_key" ON "departments"("company_id", "name");

-- CreateIndex
CREATE INDEX "leave_requests_company_id_status_idx" ON "leave_requests"("company_id", "status");

-- CreateIndex
CREATE INDEX "leave_requests_user_id_status_idx" ON "leave_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "letter_requests_company_id_status_idx" ON "letter_requests"("company_id", "status");

-- CreateIndex
CREATE INDEX "notifications_company_id_idx" ON "notifications"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_company_id_key" ON "system_settings"("key", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_national_id_key" ON "users"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_gosi_number_key" ON "users"("gosi_number");

-- CreateIndex
CREATE INDEX "users_company_id_status_idx" ON "users"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_company_id_employee_code_key" ON "users"("company_id", "employee_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspicious_attempts" ADD CONSTRAINT "suspicious_attempts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspicious_attempts" ADD CONSTRAINT "suspicious_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_manager_approver_id_fkey" FOREIGN KEY ("manager_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_hr_approver_id_fkey" FOREIGN KEY ("hr_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_requests" ADD CONSTRAINT "letter_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_requests" ADD CONSTRAINT "letter_requests_manager_approver_id_fkey" FOREIGN KEY ("manager_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_requests" ADD CONSTRAINT "letter_requests_hr_approver_id_fkey" FOREIGN KEY ("hr_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_from_home" ADD CONSTRAINT "work_from_home_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_employees" ADD CONSTRAINT "user_permission_employees_user_permission_id_fkey" FOREIGN KEY ("user_permission_id") REFERENCES "user_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_title_permissions" ADD CONSTRAINT "job_title_permissions_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "job_titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_title_permissions" ADD CONSTRAINT "job_title_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_audit_logs" ADD CONSTRAINT "permission_audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_logs" ADD CONSTRAINT "approval_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_logs" ADD CONSTRAINT "approval_logs_by_user_id_fkey" FOREIGN KEY ("by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raise_requests" ADD CONSTRAINT "raise_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raise_requests" ADD CONSTRAINT "raise_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raise_requests" ADD CONSTRAINT "raise_requests_manager_approver_id_fkey" FOREIGN KEY ("manager_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raise_requests" ADD CONSTRAINT "raise_requests_hr_approver_id_fkey" FOREIGN KEY ("hr_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raise_requests" ADD CONSTRAINT "raise_requests_finance_approver_id_fkey" FOREIGN KEY ("finance_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raise_requests" ADD CONSTRAINT "raise_requests_ceo_approver_id_fkey" FOREIGN KEY ("ceo_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_requests" ADD CONSTRAINT "advance_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_requests" ADD CONSTRAINT "advance_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_requests" ADD CONSTRAINT "advance_requests_manager_approver_id_fkey" FOREIGN KEY ("manager_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_requests" ADD CONSTRAINT "advance_requests_hr_approver_id_fkey" FOREIGN KEY ("hr_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_requests" ADD CONSTRAINT "advance_requests_finance_approver_id_fkey" FOREIGN KEY ("finance_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_requests" ADD CONSTRAINT "advance_requests_ceo_approver_id_fkey" FOREIGN KEY ("ceo_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_advance_id_fkey" FOREIGN KEY ("advance_id") REFERENCES "advance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_bank_accounts" ADD CONSTRAINT "company_bank_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structure_lines" ADD CONSTRAINT "salary_structure_lines_structure_id_fkey" FOREIGN KEY ("structure_id") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structure_lines" ADD CONSTRAINT "salary_structure_lines_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "salary_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_assignments" ADD CONSTRAINT "employee_salary_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_assignments" ADD CONSTRAINT "employee_salary_assignments_structure_id_fkey" FOREIGN KEY ("structure_id") REFERENCES "salary_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_payslip_id_fkey" FOREIGN KEY ("payslip_id") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "salary_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_original_run_id_fkey" FOREIGN KEY ("original_run_id") REFERENCES "payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gosi_configs" ADD CONSTRAINT "gosi_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retro_pays" ADD CONSTRAINT "retro_pays_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retro_pays" ADD CONSTRAINT "retro_pays_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_rules" ADD CONSTRAINT "policy_rules_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_rules" ADD CONSTRAINT "policy_rules_output_component_id_fkey" FOREIGN KEY ("output_component_id") REFERENCES "salary_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mudad_submissions" ADD CONSTRAINT "mudad_submissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mudad_submissions" ADD CONSTRAINT "mudad_submissions_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wps_submissions" ADD CONSTRAINT "wps_submissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wps_submissions" ADD CONSTRAINT "wps_submissions_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_disciplinary_policies" ADD CONSTRAINT "company_disciplinary_policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_cases" ADD CONSTRAINT "disciplinary_cases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_cases" ADD CONSTRAINT "disciplinary_cases_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_cases" ADD CONSTRAINT "disciplinary_cases_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_cases" ADD CONSTRAINT "disciplinary_cases_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "disciplinary_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "disciplinary_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_minutes" ADD CONSTRAINT "case_minutes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "disciplinary_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_disciplinary_records" ADD CONSTRAINT "employee_disciplinary_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_disciplinary_records" ADD CONSTRAINT "employee_disciplinary_records_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "disciplinary_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "disciplinary_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_status_logs" ADD CONSTRAINT "submission_status_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_chain_configs" ADD CONSTRAINT "approval_chain_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
