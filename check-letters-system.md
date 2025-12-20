# ✅ فحص نظام الخطابات - Checklist

## 📱 Mobile App
- ✅ `letter_request_card.dart` - بطاقة في الصفحة الرئيسية
- ✅ `create_letter_request_page.dart` - صفحة إنشاء طلب خطاب
- ✅ `letters_page.dart` - صفحة عرض الخطابات
- ✅ `pending_letters_page.dart` - صفحة الطلبات المعلقة (للمديرين)
- ✅ `letter_details_page.dart` - صفحة تفاصيل الخطاب
- ✅ `letters_bloc.dart` - BLoC لإدارة الحالة
- ✅ Routes في `app_router.dart` - `/letters`, `/letters/new`, `/letters/pending`, `/letters/details/:id`
- ✅ API Client methods في `api_client.dart`

## 🌐 Web Admin Dashboard
- ✅ `LettersPage.tsx` - صفحة إدارة الخطابات
- ✅ Route في `App.tsx` - `/letters`
- ✅ Menu item في `MainLayout.tsx` - "الخطابات"

## 🔧 Backend
- ✅ `letters.module.ts` - Module
- ✅ `letters.controller.ts` - Controller مع جميع الـ endpoints
- ✅ `letters.service.ts` - Service logic
- ✅ DTOs:
  - ✅ `create-letter-request.dto.ts`
  - ✅ `approve-letter.dto.ts`
  - ✅ `letter-query.dto.ts`
- ✅ `upload.service.ts` - Method `uploadLetterAttachments()`
- ✅ Database Schema - `LetterRequest` model في `schema.prisma`

## 🗄️ Database
- ⚠️ **يجب تشغيل Migration:**
  ```bash
  cd backend
  npx prisma migrate deploy
  # أو
  npx prisma migrate dev --name add_letter_requests
  ```

## 🔗 API Endpoints
- ✅ `POST /api/v1/letters` - إنشاء طلب خطاب
- ✅ `POST /api/v1/letters/upload-attachments` - رفع مرفقات
- ✅ `GET /api/v1/letters/my` - طلباتي
- ✅ `GET /api/v1/letters/:id` - تفاصيل طلب
- ✅ `DELETE /api/v1/letters/:id` - إلغاء طلب
- ✅ `GET /api/v1/letters/pending/all` - الطلبات المعلقة (Manager/Admin)
- ✅ `PATCH /api/v1/letters/:id/approve` - الموافقة (Manager/Admin)
- ✅ `PATCH /api/v1/letters/:id/reject` - الرفض (Manager/Admin)

## 📁 File Uploads
- ✅ مجلد `/var/www/attendance-system/uploads/letters/` يجب أن يكون موجود
- ✅ Nginx config يجب أن يخدم `/uploads/letters/`

## ✅ الخطوات النهائية للـ VPS:

1. **تشغيل Migration:**
   ```bash
   cd /var/www/attendance-system/backend
   npx prisma migrate deploy
   ```

2. **إنشاء مجلد المرفقات:**
   ```bash
   mkdir -p /var/www/attendance-system/uploads/letters
   chmod 755 /var/www/attendance-system/uploads/letters
   ```

3. **إعادة تشغيل Backend:**
   ```bash
   pm2 restart attendance-backend
   ```

4. **التحقق من Nginx:**
   - تأكد من أن `/uploads/letters/` يخدم الملفات بشكل صحيح

5. **اختبار النظام:**
   - إنشاء طلب خطاب من التطبيق
   - رفع مرفقات
   - الموافقة/الرفض من Dashboard
   - الموافقة/الرفض من التطبيق (للمديرين)

