import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (user && user.companyId) {
            // حقن معرف الشركة في الـ body للطلبات التي تقوم بالإنشاء أو التحديث
            if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
                if (typeof request.body === 'object' && !Array.isArray(request.body)) {
                    request.body.companyId = user.companyId;
                }
            }
        }

        return next.handle();
    }
}
