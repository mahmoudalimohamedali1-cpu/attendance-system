-- Migration: Add Permission System
-- Date: 2025-12-16
-- Description: Creates permission system tables for administrative hierarchy

-- Step 1: Add isSuperAdmin column to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN DEFAULT false;

-- Step 2: Create PermissionScope enum
DO $$ BEGIN
    CREATE TYPE "PermissionScope" AS ENUM ('SELF', 'TEAM', 'BRANCH', 'DEPARTMENT', 'ALL', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create permissions table
CREATE TABLE IF NOT EXISTS "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "requires_permission" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create unique constraint on code
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_code_key" ON "permissions"("code");

-- Step 5: Create indexes on permissions
CREATE INDEX IF NOT EXISTS "permissions_category_idx" ON "permissions"("category");
CREATE INDEX IF NOT EXISTS "permissions_code_idx" ON "permissions"("code");

-- Step 6: Create user_permissions table
CREATE TABLE IF NOT EXISTS "user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "scope" "PermissionScope" NOT NULL DEFAULT 'SELF',
    "branch_id" TEXT,
    "department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- Step 7: Create unique constraint on user_permissions
CREATE UNIQUE INDEX IF NOT EXISTS "user_permissions_user_id_permission_id_scope_branch_id_depar_key" 
ON "user_permissions"("user_id", "permission_id", "scope", "branch_id", "department_id");

-- Step 8: Create indexes on user_permissions
CREATE INDEX IF NOT EXISTS "user_permissions_user_id_idx" ON "user_permissions"("user_id");
CREATE INDEX IF NOT EXISTS "user_permissions_permission_id_idx" ON "user_permissions"("permission_id");
CREATE INDEX IF NOT EXISTS "user_permissions_user_id_permission_id_idx" ON "user_permissions"("user_id", "permission_id");
CREATE INDEX IF NOT EXISTS "user_permissions_scope_branch_id_idx" ON "user_permissions"("scope", "branch_id");
CREATE INDEX IF NOT EXISTS "user_permissions_scope_department_id_idx" ON "user_permissions"("scope", "department_id");

-- Step 9: Add foreign keys to user_permissions
ALTER TABLE "user_permissions" 
ADD CONSTRAINT "user_permissions_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permissions" 
ADD CONSTRAINT "user_permissions_permission_id_fkey" 
FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Create user_permission_employees table
CREATE TABLE IF NOT EXISTS "user_permission_employees" (
    "id" TEXT NOT NULL,
    "user_permission_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permission_employees_pkey" PRIMARY KEY ("id")
);

-- Step 11: Create unique constraint on user_permission_employees
CREATE UNIQUE INDEX IF NOT EXISTS "user_permission_employees_user_permission_id_employee_id_key" 
ON "user_permission_employees"("user_permission_id", "employee_id");

-- Step 12: Create indexes on user_permission_employees
CREATE INDEX IF NOT EXISTS "user_permission_employees_user_permission_id_idx" ON "user_permission_employees"("user_permission_id");
CREATE INDEX IF NOT EXISTS "user_permission_employees_employee_id_idx" ON "user_permission_employees"("employee_id");

-- Step 13: Add foreign key to user_permission_employees
ALTER TABLE "user_permission_employees" 
ADD CONSTRAINT "user_permission_employees_user_permission_id_fkey" 
FOREIGN KEY ("user_permission_id") REFERENCES "user_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 14: Seed default permissions
INSERT INTO "permissions" ("id", "code", "name", "name_en", "category", "description", "requires_permission", "sort_order", "created_at", "updated_at")
VALUES
  -- الإجازات
  (gen_random_uuid()::text, 'LEAVES_VIEW', 'عرض الإجازات', 'View Leaves', 'LEAVES', 'رؤية طلبات الإجازات', NULL, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'LEAVES_APPROVE', 'الموافقة على الإجازات', 'Approve Leaves', 'LEAVES', 'قبول/رفض طلبات الإجازات', 'LEAVES_VIEW', 2, NOW(), NOW()),
  
  -- الخطابات
  (gen_random_uuid()::text, 'LETTERS_VIEW', 'عرض الخطابات', 'View Letters', 'LETTERS', 'رؤية طلبات الخطابات', NULL, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'LETTERS_APPROVE', 'الموافقة على الخطابات', 'Approve Letters', 'LETTERS', 'قبول/رفض طلبات الخطابات', 'LETTERS_VIEW', 2, NOW(), NOW()),
  
  -- الحضور
  (gen_random_uuid()::text, 'ATTENDANCE_VIEW', 'عرض الحضور', 'View Attendance', 'ATTENDANCE', 'رؤية سجلات الحضور', NULL, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'ATTENDANCE_MANAGE', 'إدارة الحضور', 'Manage Attendance', 'ATTENDANCE', 'تعديل سجلات الحضور', 'ATTENDANCE_VIEW', 2, NOW(), NOW()),
  
  -- الموظفين
  (gen_random_uuid()::text, 'EMPLOYEES_VIEW', 'عرض الموظفين', 'View Employees', 'EMPLOYEES', 'رؤية بيانات الموظفين', NULL, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'EMPLOYEES_MANAGE', 'إدارة الموظفين', 'Manage Employees', 'EMPLOYEES', 'إضافة/تعديل/حذف موظفين', 'EMPLOYEES_VIEW', 2, NOW(), NOW()),
  
  -- التقارير
  (gen_random_uuid()::text, 'REPORTS_VIEW', 'عرض التقارير', 'View Reports', 'REPORTS', 'الوصول للتقارير', NULL, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'REPORTS_EXPORT', 'تصدير التقارير', 'Export Reports', 'REPORTS', 'تصدير التقارير', 'REPORTS_VIEW', 2, NOW(), NOW()),
  
  -- الإعدادات
  (gen_random_uuid()::text, 'SETTINGS_VIEW', 'عرض الإعدادات', 'View Settings', 'SETTINGS', 'رؤية إعدادات النظام', NULL, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'SETTINGS_MANAGE', 'إدارة الإعدادات', 'Manage Settings', 'SETTINGS', 'تعديل إعدادات النظام', 'SETTINGS_VIEW', 2, NOW(), NOW()),
  
  -- طلبات التحديث
  (gen_random_uuid()::text, 'DATA_UPDATES_VIEW', 'عرض طلبات التحديث', 'View Data Updates', 'DATA_UPDATES', 'رؤية طلبات تحديث البيانات', NULL, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'DATA_UPDATES_APPROVE', 'الموافقة على التحديثات', 'Approve Data Updates', 'DATA_UPDATES', 'قبول/رفض طلبات التحديث', 'DATA_UPDATES_VIEW', 2, NOW(), NOW()),
  
  -- الصلاحيات
  (gen_random_uuid()::text, 'PERMISSIONS_VIEW', 'عرض الصلاحيات', 'View Permissions', 'PERMISSIONS', 'رؤية صلاحيات الموظفين', NULL, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'PERMISSIONS_MANAGE', 'إدارة الصلاحيات', 'Manage Permissions', 'PERMISSIONS', 'تعديل صلاحيات الموظفين', 'PERMISSIONS_VIEW', 2, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Step 15: Update existing admins to be super admins
UPDATE "users" SET "is_super_admin" = true WHERE "role" = 'ADMIN';

-- Done!
