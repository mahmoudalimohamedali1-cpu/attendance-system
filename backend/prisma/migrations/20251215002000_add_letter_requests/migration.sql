-- CreateEnum
CREATE TYPE "LetterType" AS ENUM ('REQUEST', 'COMPLAINT', 'CERTIFICATION');

-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum (add new notification types)
ALTER TYPE "NotificationType" ADD VALUE 'LETTER_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'LETTER_REJECTED';

-- CreateTable
CREATE TABLE "letter_requests" (
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letter_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "letter_requests" ADD CONSTRAINT "letter_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_requests" ADD CONSTRAINT "letter_requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "letter_requests_user_id_idx" ON "letter_requests"("user_id");
CREATE INDEX "letter_requests_status_idx" ON "letter_requests"("status");
CREATE INDEX "letter_requests_approver_id_idx" ON "letter_requests"("approver_id");

