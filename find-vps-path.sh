#!/bin/bash

# اكتشاف المسار الصحيح على VPS

expect <<'EOF'
set timeout 10
spawn ssh -o StrictHostKeyChecking=no root@72.61.239.170 "find / -name 'app.module.ts' -path '*/backend/src/*' 2>/dev/null | head -1"
expect {
    "password:" {
        send "GamalSaad35@#\r"
        exp_continue
    }
    eof
}
EOF

echo ""
echo "---"
echo ""

expect <<'EOF'
set timeout 10
spawn ssh -o StrictHostKeyChecking=no root@72.61.239.170 "ls -la /var/www/ 2>/dev/null | grep attendance || ls -la /root/ | grep attendance || ls -la /home/ | grep attendance || echo 'Checking common paths...'"
expect {
    "password:" {
        send "GamalSaad35@#\r"
        exp_continue
    }
    eof
}
EOF

echo ""
echo "---"
echo ""

expect <<'EOF'
set timeout 10
spawn ssh -o StrictHostKeyChecking=no root@72.61.239.170 "pwd && whoami && ls -la | head -10"
expect {
    "password:" {
        send "GamalSaad35@#\r"
        exp_continue
    }
    eof
}
EOF

