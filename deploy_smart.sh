#!/bin/bash
# Smart Policy Deployment Script
# Run this on the VPS: bash /tmp/deploy_smart.sh

cd /var/www/attendance-system/backend

# 1. Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# 2. Add SMART to PayslipLineSource enum (if not exists)
if ! grep -q "SMART // ذكاء اصطناعي" prisma/schema.prisma; then
    sed -i '/STATUTORY.*خصومات قانونية.*GOSI.*ضرائب/a\  SMART // ذكاء اصطناعي (AI)' prisma/schema.prisma
    echo "✓ Added SMART to PayslipLineSource enum"
else
    echo "→ SMART already exists in enum"
fi

# 3. Verify enum update
echo "=== PayslipLineSource enum ==="
grep -A 8 'enum PayslipLineSource' prisma/schema.prisma

# 4. Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# 5. Rebuild backend
echo "Building backend..."
npm run build

# 6. Restart services
echo "Restarting services..."
pm2 restart all

echo "✓ Deployment complete!"
