-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'PENDING', 'BLOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB', 'UNKNOWN');

-- CreateTable
CREATE TABLE "registered_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "device_fingerprint" TEXT,
    "device_name" TEXT,
    "device_model" TEXT,
    "device_brand" TEXT,
    "platform" "DevicePlatform" NOT NULL DEFAULT 'UNKNOWN',
    "os_version" TEXT,
    "app_version" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING',
    "is_main_device" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "blocked_reason" TEXT,
    "last_used_at" TIMESTAMP(3),
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registered_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_access_logs" (
    "id" TEXT NOT NULL,
    "device_id" TEXT,
    "user_id" TEXT NOT NULL,
    "attempted_device_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "is_success" BOOLEAN NOT NULL,
    "is_known_device" BOOLEAN NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "location" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registered_devices_device_id_idx" ON "registered_devices"("device_id");

-- CreateIndex
CREATE INDEX "registered_devices_user_id_status_idx" ON "registered_devices"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registered_devices_user_id_device_id_key" ON "registered_devices"("user_id", "device_id");

-- CreateIndex
CREATE INDEX "device_access_logs_user_id_created_at_idx" ON "device_access_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "device_access_logs_attempted_device_id_idx" ON "device_access_logs"("attempted_device_id");

-- AddForeignKey
ALTER TABLE "registered_devices" ADD CONSTRAINT "registered_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_access_logs" ADD CONSTRAINT "device_access_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "registered_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
