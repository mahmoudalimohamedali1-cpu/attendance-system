# إعداد API URL للتطبيق

## المشكلة
إذا كنت تجرب التطبيق على جهاز Android حقيقي وتحصل على خطأ "فشل تسجيل الدخول" أو "DioException"، فالمشكلة غالباً في عنوان الـ API.

## الحل

### 1. معرفة IP السيرفر
- **Windows**: افتح CMD واكتب `ipconfig` وابحث عن `IPv4 Address`
- **Mac/Linux**: افتح Terminal واكتب `ifconfig` وابحث عن `inet`

مثال: `192.168.1.100`

### 2. تغيير الـ API URL

#### الطريقة الأولى: تعديل الكود مباشرة
افتح الملف:
```
lib/core/config/app_config.dart
```

وغيّر السطر 13 من:
```dart
defaultValue: 'http://10.0.2.2:3000/api/v1', // Android Emulator
```

إلى:
```dart
defaultValue: 'http://YOUR_IP:3000/api/v1', // مثال: http://192.168.1.100:3000/api/v1
```

#### الطريقة الثانية: استخدام متغير البيئة عند البناء
```bash
flutter build apk --dart-define=API_URL=http://YOUR_IP:3000/api/v1
```

مثال:
```bash
flutter build apk --dart-define=API_URL=http://192.168.1.100:3000/api/v1
```

### 3. التأكد من الاتصال
- تأكد أن السيرفر يعمل على المنفذ 3000
- تأكد أن الجهاز والسيرفر على نفس الشبكة (WiFi)
- تأكد أن Firewall لا يمنع الاتصال

### 4. إعادة بناء التطبيق
```bash
flutter clean
flutter pub get
flutter build apk
```

## ملاحظات
- `10.0.2.2` يعمل فقط مع Android Emulator
- `localhost` يعمل فقط مع iOS Simulator
- للجهاز الحقيقي، استخدم IP السيرفر في نفس الشبكة
