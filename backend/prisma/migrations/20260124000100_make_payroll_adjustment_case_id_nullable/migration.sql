-- Make case_id nullable in payroll_adjustments table
-- This allows creating payroll adjustments without a disciplinary case

-- 1. Drop the unique constraint first (it references case_id)
ALTER TABLE "payroll_adjustments" DROP CONSTRAINT IF EXISTS "payroll_adjustments_company_id_case_id_key";

-- 2. Drop the foreign key constraint
ALTER TABLE "payroll_adjustments" DROP CONSTRAINT IF EXISTS "payroll_adjustments_case_id_fkey";

-- 3. Make the column nullable
ALTER TABLE "payroll_adjustments" ALTER COLUMN "case_id" DROP NOT NULL;

-- 4. Re-add the foreign key constraint (now with nullable)
ALTER TABLE "payroll_adjustments" 
ADD CONSTRAINT "payroll_adjustments_case_id_fkey" 
FOREIGN KEY ("case_id") REFERENCES "disciplinary_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
