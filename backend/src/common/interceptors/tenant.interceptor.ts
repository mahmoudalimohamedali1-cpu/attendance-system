import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return next.handle();
        }

        // تحديد معرف الشركة (المصدر المعتمد)
        let companyId = user.companyId;

        // السماح للـ Super Admin بالتنقل بين الشركات عبر الـ Header
        if (user.isSuperAdmin && request.headers['x-company-id']) {
            companyId = request.headers['x-company-id'] as string;
        }

        if (companyId) {
            // 1. حقن في الـ request context للوصول السريع في الـ Guards والـ Services
            request['tenantId'] = companyId;

            // 2. حقن في الـ body للعمليات التي تقوم بالإنشاء أو التحديث
            if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
                if (typeof request.body === 'object' && !Array.isArray(request.body)) {
                    // إذا كان الطلب مرسل companyId مختلف وهو ليس Super Admin، نمنعه
                    if (request.body.companyId && request.body.companyId !== companyId && !user.isSuperAdmin) {
                        throw new ForbiddenException('لا يمكنك تنفيذ هذا الإجراء لشركة أخرى');
                    }
                    request.body.companyId = companyId;
                }
            }

            // 3. حقن في الـ query لعمليات الفلترة التلقائية إن أمكن (اختياري)
            if (request.method === 'GET') {
                request.query = request.query || {};
                // request.query.companyId = companyId; // ملاحظة: قد تسبب مشاكل مع بعض الـ DTOs لذا يفضل استخدامه يدوياً في الـ Controller
            }
        }

        return next.handle();
    }
}
