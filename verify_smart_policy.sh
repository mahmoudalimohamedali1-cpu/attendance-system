#!/bin/bash
# Script to verify smart policy execution integration

echo "===== Smart Policy Verification Script ====="
echo ""

cd /var/www/attendance-system/backend

# 1. Check if SMART enum exists in schema
echo "1. Checking SMART enum in schema.prisma..."
grep -n "SMART" prisma/schema.prisma

echo ""
echo "2. Checking smart_policies table..."
# Get DATABASE_URL from .env
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)
echo "Database URL: ${DB_URL:0:30}..."

# Count smart policies
psql "$DB_URL" -c "SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM smart_policies;"

echo ""
echo "3. Listing active smart policies..."
psql "$DB_URL" -c "SELECT id, name, is_active, status, trigger_event FROM smart_policies WHERE is_active = true LIMIT 5;"

echo ""
echo "4. Checking SmartPolicyExecutorService in payroll-runs.service.ts..."
grep -n "SMART" src/modules/payroll-runs/payroll-runs.service.ts

echo ""
echo "5. Checking recent logs for smart policy execution..."
pm2 logs attendance-backend --lines 50 --nostream 2>&1 | grep -i "smart\|policy" | tail -10

echo ""
echo "===== Verification Complete ====="
