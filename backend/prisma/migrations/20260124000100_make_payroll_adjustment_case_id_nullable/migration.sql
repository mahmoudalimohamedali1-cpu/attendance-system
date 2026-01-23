-- Make optional columns nullable in payroll_adjustments table
-- This allows creating payroll adjustments without a disciplinary case or explicit period/user

-- 1. Drop constraints that reference these columns
ALTER TABLE "payroll_adjustments" DROP CONSTRAINT IF EXISTS "payroll_adjustments_company_id_case_id_key";
ALTER TABLE "payroll_adjustments" DROP CONSTRAINT IF EXISTS "payroll_adjustments_case_id_fkey";
ALTER TABLE "payroll_adjustments" DROP CONSTRAINT IF EXISTS "payroll_adjustments_payroll_period_id_fkey";
ALTER TABLE "payroll_adjustments" DROP CONSTRAINT IF EXISTS "payroll_adjustments_user_id_fkey";

-- 2. Make the columns nullable
ALTER TABLE "payroll_adjustments" ALTER COLUMN "case_id" DROP NOT NULL;
ALTER TABLE "payroll_adjustments" ALTER COLUMN "payroll_period_id" DROP NOT NULL;
ALTER TABLE "payroll_adjustments" ALTER COLUMN "user_id" DROP NOT NULL;

-- 3. Re-add the foreign key constraints (now allowing null)
ALTER TABLE "payroll_adjustments" 
ADD CONSTRAINT "payroll_adjustments_case_id_fkey" 
FOREIGN KEY ("case_id") REFERENCES "disciplinary_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_adjustments" 
ADD CONSTRAINT "payroll_adjustments_payroll_period_id_fkey" 
FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_adjustments" 
ADD CONSTRAINT "payroll_adjustments_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
