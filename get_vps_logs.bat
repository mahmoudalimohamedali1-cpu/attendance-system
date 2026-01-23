ssh -i C:\Users\Administrator\.ssh\id_rsa_vps -o StrictHostKeyChecking=no root@72.61.239.170 "pm2 logs backend --lines 100 --no-color" > vps_backend_logs.txt 2>&1
