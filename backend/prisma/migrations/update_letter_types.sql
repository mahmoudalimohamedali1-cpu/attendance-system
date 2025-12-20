-- Migration: Update LetterType enum to new letter types
-- Date: 2025-12-16
-- Description: Changing letter types from (REQUEST, COMPLAINT, CERTIFICATION) to 12 new types

-- Step 1: Add new enum values to LetterType
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'SALARY_DEFINITION';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'SERVICE_CONFIRMATION';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'SALARY_ADJUSTMENT';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'PROMOTION';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'TRANSFER_ASSIGNMENT';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'RESIGNATION';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'TERMINATION';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'CLEARANCE';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'EXPERIENCE';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'SALARY_DEFINITION_DIRECTED';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'NOC';
ALTER TYPE "LetterType" ADD VALUE IF NOT EXISTS 'DELEGATION';

-- Note: Old values (REQUEST, COMPLAINT, CERTIFICATION) are kept for backward compatibility
-- Any existing records with old types will still work
-- You can optionally migrate old records to new types if needed:
-- UPDATE letter_requests SET type = 'SALARY_DEFINITION' WHERE type = 'REQUEST';
