#!/usr/bin/env python3
import paramiko
import os
from scp import SCPClient

VPS_HOST = "72.61.239.170"
VPS_USER = "root"
VPS_PASS = "GamalSaad35@#"
PROJECT_PATH = "/root/attendance-system"
LOCAL_FILE = "web-admin/src/pages/custody/CustodyItemForm.tsx"
REMOTE_FILE = f"{PROJECT_PATH}/web-admin/src/pages/custody/CustodyItemForm.tsx"

print("🚀 رفع إصلاح العهدة إلى VPS...")

# الاتصال بـ SSH
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("📡 الاتصال بـ VPS...")
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
    
    print("📤 رفع الملف...")
    with SCPClient(ssh.get_transport()) as scp:
        scp.put(LOCAL_FILE, REMOTE_FILE)
    
    print("✅ تم رفع الملف بنجاح!")
    
    print("🔨 بناء المشروع...")
    stdin, stdout, stderr = ssh.exec_command(f"cd {PROJECT_PATH}/web-admin && npm run build")
    exit_status = stdout.channel.recv_exit_status()
    
    if exit_status == 0:
        print("✅ تم البناء بنجاح!")
    else:
        print(f"⚠️  البناء اكتمل مع كود خروج: {exit_status}")
        print(stderr.read().decode())
    
    print("🔄 إعادة تشغيل الخدمة...")
    stdin, stdout, stderr = ssh.exec_command(f"cd {PROJECT_PATH}/web-admin && pm2 restart web-admin || pm2 restart all || echo 'Manual restart needed'")
    print(stdout.read().decode())
    
    print("\n✅ اكتمل الرفع بنجاح!")
    
except Exception as e:
    print(f"❌ خطأ: {e}")
finally:
    ssh.close()

