-- CreateEnum
CREATE TYPE "ForecastPeriodType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "ForecastStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ScenarioType" AS ENUM ('HIRE', 'TERMINATE', 'SCHEDULE_CHANGE', 'COST_REDUCTION', 'EXPANSION');

-- CreateEnum
CREATE TYPE "ScenarioStatus" AS ENUM ('DRAFT', 'ANALYZING', 'COMPLETED', 'IMPLEMENTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GapSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GapStatus" AS ENUM ('IDENTIFIED', 'NOTIFIED', 'RESOLVING', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('SALES', 'PRODUCTION', 'ORDERS', 'TRAFFIC', 'WORKLOAD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OptimizationType" AS ENUM ('SCHEDULE_ADJUSTMENT', 'HEADCOUNT_CHANGE', 'SHIFT_RESTRUCTURE', 'OVERTIME_REDUCTION', 'COST_SAVING');

-- CreateEnum
CREATE TYPE "OptimizationStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPROVED', 'IMPLEMENTED', 'REJECTED');

-- CreateTable
CREATE TABLE "workforce_demand_forecasts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "department_id" TEXT,
    "period_type" "ForecastPeriodType" NOT NULL DEFAULT 'MONTHLY',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "ForecastStatus" NOT NULL DEFAULT 'ACTIVE',
    "predicted_headcount" INTEGER NOT NULL,
    "current_headcount" INTEGER NOT NULL,
    "required_headcount" INTEGER NOT NULL,
    "confidence_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "historical_data" JSONB,
    "seasonal_factors" JSONB,
    "ai_insights" TEXT,
    "estimated_labor_cost" DECIMAL(12,2),
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workforce_demand_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimal_schedules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "department_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "constraints" JSONB NOT NULL,
    "schedule_data" JSONB NOT NULL,
    "coverage_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cost_efficiency" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "employee_satisfaction" DECIMAL(5,2) DEFAULT 0,
    "estimated_cost" DECIMAL(12,2) NOT NULL,
    "current_cost" DECIMAL(12,2),
    "cost_savings" DECIMAL(12,2),
    "is_implemented" BOOLEAN NOT NULL DEFAULT false,
    "implemented_at" TIMESTAMP(3),
    "ai_recommendations" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "optimal_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_gaps" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "department_id" TEXT,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "severity" "GapSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "GapStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "required_employees" INTEGER NOT NULL,
    "available_employees" INTEGER NOT NULL,
    "gap_size" INTEGER NOT NULL,
    "estimated_impact" TEXT,
    "business_metrics" JSONB,
    "recommendations" TEXT,
    "action_taken" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "notifications_sent" BOOLEAN NOT NULL DEFAULT false,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coverage_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "what_if_scenarios" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ScenarioType" NOT NULL,
    "status" "ScenarioStatus" NOT NULL DEFAULT 'DRAFT',
    "parameters" JSONB NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "baseline_cost" DECIMAL(12,2) NOT NULL,
    "projected_cost" DECIMAL(12,2) NOT NULL,
    "cost_difference" DECIMAL(12,2) NOT NULL,
    "baseline_coverage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "projected_coverage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "impact_analysis" TEXT,
    "risks" TEXT,
    "benefits" TEXT,
    "ai_insights" TEXT,
    "is_implemented" BOOLEAN NOT NULL DEFAULT false,
    "implemented_at" TIMESTAMP(3),
    "implemented_by" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "what_if_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_metrics" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "metricType" "MetricType" NOT NULL,
    "metric_name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "metadata" JSONB,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_optimizations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "department_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "optimization_type" "OptimizationType" NOT NULL,
    "status" "OptimizationStatus" NOT NULL DEFAULT 'PENDING',
    "current_cost" DECIMAL(12,2) NOT NULL,
    "optimized_cost" DECIMAL(12,2) NOT NULL,
    "potential_savings" DECIMAL(12,2) NOT NULL,
    "savings_percentage" DECIMAL(5,2) NOT NULL,
    "analysis_data" JSONB NOT NULL,
    "recommendations" TEXT NOT NULL,
    "requirements" TEXT,
    "risks" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "ai_reasoning" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "implemented_by" TEXT,
    "implemented_at" TIMESTAMP(3),
    "actual_savings" DECIMAL(12,2),
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_optimizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workforce_demand_forecasts_company_id_start_date_idx" ON "workforce_demand_forecasts"("company_id", "start_date");

-- CreateIndex
CREATE INDEX "workforce_demand_forecasts_branch_id_start_date_idx" ON "workforce_demand_forecasts"("branch_id", "start_date");

-- CreateIndex
CREATE INDEX "workforce_demand_forecasts_status_idx" ON "workforce_demand_forecasts"("status");

-- CreateIndex
CREATE INDEX "optimal_schedules_company_id_start_date_idx" ON "optimal_schedules"("company_id", "start_date");

-- CreateIndex
CREATE INDEX "optimal_schedules_branch_id_start_date_idx" ON "optimal_schedules"("branch_id", "start_date");

-- CreateIndex
CREATE INDEX "optimal_schedules_is_implemented_idx" ON "optimal_schedules"("is_implemented");

-- CreateIndex
CREATE INDEX "coverage_gaps_company_id_date_severity_idx" ON "coverage_gaps"("company_id", "date", "severity");

-- CreateIndex
CREATE INDEX "coverage_gaps_branch_id_date_idx" ON "coverage_gaps"("branch_id", "date");

-- CreateIndex
CREATE INDEX "coverage_gaps_status_idx" ON "coverage_gaps"("status");

-- CreateIndex
CREATE INDEX "what_if_scenarios_company_id_status_idx" ON "what_if_scenarios"("company_id", "status");

-- CreateIndex
CREATE INDEX "what_if_scenarios_type_idx" ON "what_if_scenarios"("type");

-- CreateIndex
CREATE INDEX "business_metrics_company_id_date_idx" ON "business_metrics"("company_id", "date");

-- CreateIndex
CREATE INDEX "business_metrics_branch_id_date_idx" ON "business_metrics"("branch_id", "date");

-- CreateIndex
CREATE INDEX "business_metrics_metricType_date_idx" ON "business_metrics"("metricType", "date");

-- CreateIndex
CREATE INDEX "cost_optimizations_company_id_status_idx" ON "cost_optimizations"("company_id", "status");

-- CreateIndex
CREATE INDEX "cost_optimizations_branch_id_status_idx" ON "cost_optimizations"("branch_id", "status");

-- CreateIndex
CREATE INDEX "cost_optimizations_priority_status_idx" ON "cost_optimizations"("priority", "status");

-- CreateIndex
CREATE UNIQUE INDEX "business_metrics_company_id_branch_id_metricType_date_key" ON "business_metrics"("company_id", "branch_id", "metricType", "date");

-- AddForeignKey
ALTER TABLE "workforce_demand_forecasts" ADD CONSTRAINT "workforce_demand_forecasts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_demand_forecasts" ADD CONSTRAINT "workforce_demand_forecasts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_demand_forecasts" ADD CONSTRAINT "workforce_demand_forecasts_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimal_schedules" ADD CONSTRAINT "optimal_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimal_schedules" ADD CONSTRAINT "optimal_schedules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimal_schedules" ADD CONSTRAINT "optimal_schedules_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_gaps" ADD CONSTRAINT "coverage_gaps_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_gaps" ADD CONSTRAINT "coverage_gaps_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_gaps" ADD CONSTRAINT "coverage_gaps_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "what_if_scenarios" ADD CONSTRAINT "what_if_scenarios_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_optimizations" ADD CONSTRAINT "cost_optimizations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_optimizations" ADD CONSTRAINT "cost_optimizations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_optimizations" ADD CONSTRAINT "cost_optimizations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
