-- Idempotent script to recover missing tables and enums on VPS
-- This script fixes the P1014 and P3006 errors by manually creating missing schema elements

DO $$
BEGIN
    -- Enums for Muqeem Transaction Type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MuqeemTransactionType') THEN
        CREATE TYPE "MuqeemTransactionType" AS ENUM (
            'IQAMA_ISSUE', 'IQAMA_RENEW', 'IQAMA_TRANSFER', 
            'VISA_EXIT_REENTRY_ISSUE', 'VISA_EXIT_REENTRY_CANCEL', 'VISA_EXIT_REENTRY_EXTEND', 'VISA_EXIT_REENTRY_REPRINT',
            'VISA_FINAL_EXIT_ISSUE', 'VISA_FINAL_EXIT_CANCEL',
            'PASSPORT_EXTEND', 'PASSPORT_RENEW'
        );
    END IF;

    -- Enums for Muqeem Transaction Status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MuqeemTransactionStatus') THEN
        CREATE TYPE "MuqeemTransactionStatus" AS ENUM (
            'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
        );
    END IF;

    -- Enum for EmployeeDocument Type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentType') THEN
        CREATE TYPE "DocumentType" AS ENUM (
            'ID_CARD', 'IQAMA', 'PASSPORT', 'CONTRACT', 'CERTIFICATE', 
            'MEDICAL', 'BANK_LETTER', 'DRIVING_LICENSE', 'QUALIFICATION', 'OTHER'
        );
    END IF;
END
$$;

-- Table: employee_documents
CREATE TABLE IF NOT EXISTS "employee_documents" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "title_ar" TEXT,
    "description" TEXT,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "original_name" TEXT,
    "thumbnail_path" TEXT,
    "document_number" TEXT,
    "issue_date" DATE,
    "expiry_date" DATE,
    "issuing_authority" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "uploaded_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- Table: muqeem_transactions
CREATE TABLE IF NOT EXISTS "muqeem_transactions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "MuqeemTransactionType" NOT NULL,
    "status" "MuqeemTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "response" JSONB,
    "external_ref" TEXT,
    "error_message" TEXT,
    "file_url" TEXT,
    "created_by_id" TEXT,
    "executed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "muqeem_transactions_pkey" PRIMARY KEY ("id")
);

-- Table: muqeem_configs
CREATE TABLE IF NOT EXISTS "muqeem_configs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "iqama_expiry_days" INTEGER NOT NULL DEFAULT 30,
    "passport_expiry_days" INTEGER NOT NULL DEFAULT 60,
    "enable_notifications" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "muqeem_configs_pkey" PRIMARY KEY ("id")
);

-- UNIQUE Index for muqeem_configs
CREATE UNIQUE INDEX IF NOT EXISTS "muqeem_configs_company_id_key" ON "muqeem_configs"("company_id");

-- Foreign Keys (Idempotent using DO block)
DO $$
BEGIN
    -- employee_documents
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_documents_user_id_fkey') THEN
        ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- muqeem_transactions
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'muqeem_transactions_user_id_fkey') THEN
        ALTER TABLE "muqeem_transactions" ADD CONSTRAINT "muqeem_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'muqeem_transactions_company_id_fkey') THEN
        ALTER TABLE "muqeem_transactions" ADD CONSTRAINT "muqeem_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'muqeem_transactions_created_by_id_fkey') THEN
        ALTER TABLE "muqeem_transactions" ADD CONSTRAINT "muqeem_transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- muqeem_configs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'muqeem_configs_company_id_fkey') THEN
        ALTER TABLE "muqeem_configs" ADD CONSTRAINT "muqeem_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- Create Indexes
CREATE INDEX IF NOT EXISTS "employee_documents_user_id_idx" ON "employee_documents"("user_id");
CREATE INDEX IF NOT EXISTS "employee_documents_company_id_type_idx" ON "employee_documents"("company_id", "type");
CREATE INDEX IF NOT EXISTS "employee_documents_expiry_date_idx" ON "employee_documents"("expiry_date");

CREATE INDEX IF NOT EXISTS "muqeem_transactions_company_id_idx" ON "muqeem_transactions"("company_id");
CREATE INDEX IF NOT EXISTS "muqeem_transactions_user_id_idx" ON "muqeem_transactions"("user_id");
CREATE INDEX IF NOT EXISTS "muqeem_transactions_status_idx" ON "muqeem_transactions"("status");
CREATE INDEX IF NOT EXISTS "muqeem_transactions_type_idx" ON "muqeem_transactions"("type");
