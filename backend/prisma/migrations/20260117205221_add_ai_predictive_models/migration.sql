-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "absence_predictions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prediction_date" DATE NOT NULL,
    "absence_likelihood" DECIMAL(5,2) NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "contributing_factors" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absence_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_accuracies" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "accuracy" DECIMAL(5,4) NOT NULL,
    "precision" DECIMAL(5,4) NOT NULL,
    "recall" DECIMAL(5,4) NOT NULL,
    "f1_score" DECIMAL(5,4) NOT NULL,
    "evaluated_at" TIMESTAMP(3) NOT NULL,
    "prediction_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prediction_accuracies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_patterns" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "pattern_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affected_employees" JSONB NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absence_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "absence_predictions_company_id_prediction_date_idx" ON "absence_predictions"("company_id", "prediction_date");

-- CreateIndex
CREATE INDEX "absence_predictions_user_id_prediction_date_idx" ON "absence_predictions"("user_id", "prediction_date");

-- CreateIndex
CREATE INDEX "absence_predictions_risk_level_idx" ON "absence_predictions"("risk_level");

-- CreateIndex
CREATE INDEX "prediction_accuracies_company_id_evaluated_at_idx" ON "prediction_accuracies"("company_id", "evaluated_at");

-- CreateIndex
CREATE INDEX "prediction_accuracies_model_version_idx" ON "prediction_accuracies"("model_version");

-- CreateIndex
CREATE INDEX "absence_patterns_company_id_detected_at_idx" ON "absence_patterns"("company_id", "detected_at");

-- CreateIndex
CREATE INDEX "absence_patterns_pattern_type_idx" ON "absence_patterns"("pattern_type");

-- AddForeignKey
ALTER TABLE "absence_predictions" ADD CONSTRAINT "absence_predictions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_predictions" ADD CONSTRAINT "absence_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_accuracies" ADD CONSTRAINT "prediction_accuracies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_patterns" ADD CONSTRAINT "absence_patterns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
