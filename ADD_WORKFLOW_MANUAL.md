# 🔧 إضافة Workflow يدوياً (لأن GitHub يرفض رفعه تلقائياً)

## ⚠️ المشكلة:
GitHub يرفض رفع workflows بدون workflow scope في OAuth token

## ✅ الحل - إضافة Workflow يدوياً:

### 1. اذهب إلى:
```
https://github.com/mahmoudalimohamedali1-cpu/attendance-system
```

### 2. اضغط على:
**"Add file"** → **"Create new file"**

### 3. المسار:
اكتب في المسار:
```
.github/workflows/pages.yml
```

### 4. الصيغة:
انسخ محتوى الملف من:
```
attendance-system/.github/workflows/pages.yml
```

أو استخدم هذا المحتوى:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: web-admin/package-lock.json

      - name: Install dependencies
        working-directory: ./web-admin
        run: npm ci

      - name: Build
        working-directory: ./web-admin
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL || 'http://localhost:3000/api/v1' }}
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './web-admin/dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 5. Commit:
- **Commit message:** "Add GitHub Pages workflow"
- **Commit directly to main branch**
- **Commit new file**

---

## ✅ بعد إضافة Workflow:

1. **إضافة Environment Variable:**
   https://github.com/mahmoudalimohamedali1-cpu/attendance-system/settings/secrets/actions
   - Name: `VITE_API_URL`
   - Value: `https://your-api.com/api/v1`

2. **تفعيل GitHub Pages:**
   https://github.com/mahmoudalimohamedali1-cpu/attendance-system/settings/pages
   - Source: **GitHub Actions**
   - Save

3. **تشغيل Workflow:**
   https://github.com/mahmoudalimohamedali1-cpu/attendance-system/actions
   - اضغط على **"Deploy to GitHub Pages"**
   - **Run workflow** → **main** → **Run workflow**

---

## 🔗 Dashboard URL:
```
https://mahmoudalimohamedali1-cpu.github.io/attendance-system/
```
