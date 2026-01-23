@echo off
ssh -i C:\Users\Administrator\.ssh\id_rsa_vps -o StrictHostKeyChecking=no root@72.61.239.170 "cd /root/attendance-system/backend && npx prisma migrate dev --name add_muqeem_integration"
