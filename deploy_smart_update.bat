@echo off
echo Deploying Smart Policy updates to VPS...

REM Copy files to VPS
scp "c:\Users\Administrator\Downloads\attendance system\attendance-system\backend\src\modules\smart-policies\policy-context.service.ts" root@72.61.239.170:/var/www/attendance-system/backend/src/modules/smart-policies/

scp "c:\Users\Administrator\Downloads\attendance system\attendance-system\backend\src\modules\smart-policies\smart-policies.service.ts" root@72.61.239.170:/var/www/attendance-system/backend/src/modules/smart-policies/

scp "c:\Users\Administrator\Downloads\attendance system\attendance-system\backend\src\modules\smart-policies\smart-policies.controller.ts" root@72.61.239.170:/var/www/attendance-system/backend/src/modules/smart-policies/

REM Build and restart on VPS
ssh root@72.61.239.170 "cd /var/www/attendance-system/backend && npm run build && pm2 restart attendance-backend"

echo Done!
pause
