-- Migration: Add Letter Requests Feature
-- Date: 2025-12-15
-- Description: إضافة ميزة طلبات الخطابات

-- CreateEnum: LetterType
DO $$ BEGIN
    CREATE TYPE "LetterType" AS ENUM ('REQUEST', 'COMPLAINT', 'CERTIFICATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: LetterStatus
DO $$ BEGIN
    CREATE TYPE "LetterStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterEnum: Add new notification types for letters
DO $$ BEGIN
    ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LETTER_APPROVED';
    ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LETTER_REJECTED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: letter_requests
CREATE TABLE IF NOT EXISTS "letter_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "LetterType" NOT NULL,
    "notes" VARCHAR(200),
    "attachments" JSONB,
    "status" "LetterStatus" NOT NULL DEFAULT 'PENDING',
    "approver_id" TEXT,
    "approver_notes" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "letter_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: letter_requests.user_id -> users.id
DO $$ BEGIN
    ALTER TABLE "letter_requests" 
    ADD CONSTRAINT "letter_requests_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey: letter_requests.approver_id -> users.id
DO $$ BEGIN
    ALTER TABLE "letter_requests" 
    ADD CONSTRAINT "letter_requests_approver_id_fkey" 
    FOREIGN KEY ("approver_id") REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateIndex: letter_requests indexes
CREATE INDEX IF NOT EXISTS "letter_requests_user_id_idx" ON "letter_requests"("user_id");
CREATE INDEX IF NOT EXISTS "letter_requests_status_idx" ON "letter_requests"("status");
CREATE INDEX IF NOT EXISTS "letter_requests_approver_id_idx" ON "letter_requests"("approver_id");

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_letter_requests_updated_at ON "letter_requests";
CREATE TRIGGER update_letter_requests_updated_at
    BEFORE UPDATE ON "letter_requests"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

