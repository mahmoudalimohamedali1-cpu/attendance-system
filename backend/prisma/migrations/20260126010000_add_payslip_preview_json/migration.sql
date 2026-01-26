-- AddPayslipPreviewJson
-- Add earnings_json and deductions_json columns to payslips table
-- These store the preview data for displaying exact same items in payslip details

ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "earnings_json" JSONB;
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "deductions_json" JSONB;

-- Add comment for documentation
COMMENT ON COLUMN "payslips"."earnings_json" IS 'Stores earnings items from preview: [{name, code, amount}]';
COMMENT ON COLUMN "payslips"."deductions_json" IS 'Stores deduction items from preview: [{name, code, amount}]';
