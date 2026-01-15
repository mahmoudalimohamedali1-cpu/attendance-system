-- CreateEnum
CREATE TYPE "IntegrationCategory" AS ENUM ('ACCOUNTING', 'ERP', 'COMMUNICATION', 'HR', 'PAYROLL', 'BANKING', 'OTHER');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "IntegrationHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "IntegrationLogAction" AS ENUM ('SYNC', 'TEST', 'CONFIGURE', 'ENABLE', 'DISABLE', 'ERROR');

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "IntegrationCategory" NOT NULL,
    "logo" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" "IntegrationStatus" NOT NULL DEFAULT 'INACTIVE',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "developer_name" TEXT,
    "developer_email" TEXT,
    "website_url" TEXT,
    "documentation_url" TEXT,
    "support_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "api_key" TEXT,
    "api_secret" TEXT,
    "webhook_url" TEXT,
    "config_data" JSONB,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sync_interval" INTEGER,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "action" "IntegrationLogAction" NOT NULL,
    "status" "IntegrationStatus" NOT NULL,
    "message" TEXT,
    "error_code" TEXT,
    "error_details" JSONB,
    "metadata" JSONB,
    "duration" INTEGER,
    "records_processed" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_health" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "status" "IntegrationHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "last_check_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "total_syncs" INTEGER NOT NULL DEFAULT 0,
    "successful_syncs" INTEGER NOT NULL DEFAULT 0,
    "failed_syncs" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "consecutive_errors" INTEGER NOT NULL DEFAULT 0,
    "avg_response_time" DOUBLE PRECISION,
    "uptime" DOUBLE PRECISION,
    "status_message" TEXT,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integrations_slug_key" ON "integrations"("slug");

-- CreateIndex
CREATE INDEX "integrations_company_id_status_idx" ON "integrations"("company_id", "status");

-- CreateIndex
CREATE INDEX "integrations_category_idx" ON "integrations"("category");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_company_id_slug_key" ON "integrations"("company_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_integration_id_key" ON "integration_configs"("integration_id");

-- CreateIndex
CREATE INDEX "integration_logs_integration_id_created_at_idx" ON "integration_logs"("integration_id", "created_at");

-- CreateIndex
CREATE INDEX "integration_logs_company_id_created_at_idx" ON "integration_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "integration_logs_action_status_idx" ON "integration_logs"("action", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_health_integration_id_key" ON "integration_health"("integration_id");

-- CreateIndex
CREATE INDEX "integration_health_status_idx" ON "integration_health"("status");

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_health" ADD CONSTRAINT "integration_health_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
