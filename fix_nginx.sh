#!/bin/bash
# Script to fix nginx configuration for serving JS chunks

echo "=== Fixing nginx configuration for web-admin ==="
echo ""

# 1. Find nginx config files
echo "1. Finding nginx config files..."
CONFIG_FILE=$(find /etc/nginx -name "*.conf" -type f | grep -E "(nginx.conf|default.conf)" | head -1)
echo "Main config: $CONFIG_FILE"

# 2. Check if chunks exist
echo ""
echo "2. Checking if chunks exist..."
ls -la /var/www/attendance-system/web-admin/dist/js/chunks/ | head -5

# 3. Cleanup conflicting configs
echo "3. Cleaning up conflicting configs..."
rm -f /etc/nginx/sites-enabled/attendance
rm -f /etc/nginx/sites-available/attendance

# 4. Backing up current nginx config...
echo ""
echo "4. Backing up current nginx config..."
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%s)"

# 4. Find the server block and check try_files
echo ""
echo "4. Current nginx configuration:"
grep -A 20 "location / {" "$CONFIG_FILE" | head -25

# 5. Fix: Update nginx to serve static files correctly
echo ""
echo "5. Applying fix..."

# Create a proper nginx config for SPA
cat > /etc/nginx/conf.d/attendance-web.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    root /var/www/attendance-system/web-admin/dist;
    index index.html;
    
    # Serve static files directly
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
    }
    
    # SPA fallback - all other requests go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# 6. Test nginx config
echo ""
echo "6. Testing nginx config..."
nginx -t

# 7. Reload nginx
if [ $? -eq 0 ]; then
    echo ""
    echo "7. Reloading nginx..."
    nginx -s reload
    echo "✅ Nginx reloaded successfully!"
    
    # 8. Test if chunks are now accessible
    echo ""
    echo "8. Testing chunk access..."
    CHUNK_FILE=$(ls /var/www/attendance-system/web-admin/dist/js/chunks/*.js 2>/dev/null | head -1)
    if [ -n "$CHUNK_FILE" ]; then
        CHUNK_NAME=$(basename "$CHUNK_FILE")
        echo "Testing: http://localhost/js/chunks/$CHUNK_NAME"
        curl -I "http://localhost/js/chunks/$CHUNK_NAME" | head -3
    fi
    
    echo ""
    echo "🎉 Done! Try refreshing the website now."
else
    echo "❌ Nginx config test failed. Check the error above."
    echo "Restoring backup..."
    cp "${CONFIG_FILE}.backup."* "$CONFIG_FILE"
fi
