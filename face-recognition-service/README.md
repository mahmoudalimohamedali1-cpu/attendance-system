# خدمة التعرف على الوجه - Face Recognition Service

خدمة Python للتعرف على الوجوه باستخدام مكتبة `face_recognition`.

## المتطلبات

- Python 3.8+
- pip

### للـ macOS:
```bash
brew install cmake
```

### للـ Ubuntu/Debian:
```bash
sudo apt-get install cmake libopenblas-dev liblapack-dev libx11-dev
```

## التثبيت

```bash
# إنشاء بيئة افتراضية
python3 -m venv venv

# تفعيل البيئة
source venv/bin/activate  # macOS/Linux
# أو
.\venv\Scripts\activate  # Windows

# تثبيت المتطلبات
pip install -r requirements.txt
```

## التشغيل

```bash
# طريقة سهلة
./start.sh

# أو يدوياً
source venv/bin/activate
python app.py
```

## API Endpoints

### 1. التحقق من حالة الخدمة
```
GET /health
```

### 2. اكتشاف الوجه واستخراج الـ Embedding
```
POST /api/face/detect
Body: { "image": "base64_encoded_image" }
```

### 3. تسجيل وجه جديد
```
POST /api/face/register
Body: { "image": "base64_encoded_image", "user_id": "optional" }
```

### 4. التحقق من الوجه
```
POST /api/face/verify
Body: { "image": "base64_encoded_image", "stored_embedding": [...] }
```

### 5. مقارنة وجهين
```
POST /api/face/compare
Body (Option 1): { "image1": "...", "image2": "..." }
Body (Option 2): { "embedding": [...], "image": "..." }
Body (Option 3): { "embedding1": [...], "embedding2": [...] }
```

## الإعدادات

قم بنسخ `.env.example` إلى `.env` وتعديل الإعدادات:

```env
PORT=5001
DEBUG=false
MATCH_THRESHOLD=0.6  # عتبة التطابق (أقل = أكثر صرامة)
```

## الاستخدام مع التطبيق

1. شغل الخدمة على نفس الشبكة
2. تأكد من أن `FACE_URL` في التطبيق يشير لعنوان IP الصحيح
3. مثال: `http://192.168.1.100:5001`

