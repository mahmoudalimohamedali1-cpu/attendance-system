@echo off
ssh -i C:\Users\Administrator\.ssh\id_rsa_vps -o StrictHostKeyChecking=no root@72.61.239.170 "pm2 logs backend --lines 50 --no-colors" > vps_logs.txt 2>&1
