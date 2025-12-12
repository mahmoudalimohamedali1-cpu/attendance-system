-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "check_in_face_confidence" DOUBLE PRECISION,
ADD COLUMN     "check_in_face_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "check_out_face_confidence" DOUBLE PRECISION,
ADD COLUMN     "check_out_face_verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "face_registered" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "face_data" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "face_embedding" TEXT NOT NULL,
    "face_image" TEXT,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_verified_at" TIMESTAMP(3),
    "verification_count" INTEGER NOT NULL DEFAULT 0,
    "image_quality" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "face_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_verification_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "verification_type" TEXT NOT NULL,
    "is_success" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "device_info" TEXT,
    "ip_address" TEXT,
    "attempt_image" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "face_data_user_id_key" ON "face_data"("user_id");

-- CreateIndex
CREATE INDEX "face_verification_logs_user_id_created_at_idx" ON "face_verification_logs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "face_data" ADD CONSTRAINT "face_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
