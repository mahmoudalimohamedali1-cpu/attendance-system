@echo off
echo === Deploying Tasks Planning Fix to VPS ===
echo.

cd /d "c:\Users\Administrator\Downloads\attendance system\attendance-system"

echo [1/4] Uploading task-planning.service.ts...
scp -o ConnectTimeout=30 "backend\src\modules\tasks\task-planning.service.ts" root@72.61.239.170:/var/www/attendance-system/backend/src/modules/tasks/

echo [2/4] Uploading task-planning.controller.ts...
scp -o ConnectTimeout=30 "backend\src\modules\tasks\task-planning.controller.ts" root@72.61.239.170:/var/www/attendance-system/backend/src/modules/tasks/

echo [3/4] Uploading task-recovery files...
scp -o ConnectTimeout=30 "backend\src\modules\tasks\task-recovery.service.ts" root@72.61.239.170:/var/www/attendance-system/backend/src/modules/tasks/
scp -o ConnectTimeout=30 "backend\src\modules\tasks\task-recovery.controller.ts" root@72.61.239.170:/var/www/attendance-system/backend/src/modules/tasks/

echo [4/4] Uploading tasks.module.ts...
scp -o ConnectTimeout=30 "backend\src\modules\tasks\tasks.module.ts" root@72.61.239.170:/var/www/attendance-system/backend/src/modules/tasks/

echo.
echo === Rebuilding backend on VPS ===
ssh -o ConnectTimeout=30 root@72.61.239.170 "cd /var/www/attendance-system/backend && npm run build && pm2 restart 0"

echo.
echo === Deployment Complete ===
pause
