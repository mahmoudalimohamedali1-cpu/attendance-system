-- CreateEnum
CREATE TYPE "UpdateRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UpdateRequestType" AS ENUM ('FACE_UPDATE', 'DEVICE_UPDATE', 'BOTH', 'DEVICE_CHANGE');

-- CreateTable
CREATE TABLE "data_update_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "request_type" "UpdateRequestType" NOT NULL,
    "status" "UpdateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "new_face_embedding" TEXT,
    "new_face_image" TEXT,
    "face_image_quality" DOUBLE PRECISION,
    "new_device_id" TEXT,
    "new_device_fingerprint" TEXT,
    "new_device_name" TEXT,
    "new_device_model" TEXT,
    "new_device_brand" TEXT,
    "new_device_platform" "DevicePlatform",
    "new_device_os_version" TEXT,
    "new_device_app_version" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "rejection_reason" TEXT,
    "old_device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_update_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_update_requests_user_id_status_idx" ON "data_update_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "data_update_requests_status_created_at_idx" ON "data_update_requests"("status", "created_at");
