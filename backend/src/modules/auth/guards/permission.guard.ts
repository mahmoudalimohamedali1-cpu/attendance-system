import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PermissionsService } from '../../permissions/permissions.service';

/**
 * PermissionGuard - يتحقق من الصلاحية المحددة بـ @RequirePermission
 * 
 * الاستخدام:
 * @RequirePermission('MUDAD_SUBMIT')
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 */
@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionsService: PermissionsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.getAllAndOverride<string>(
            PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );

        // لا يوجد @RequirePermission → السماح
        if (!requiredPermission) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('يجب تسجيل الدخول أولاً');
        }

        // التحقق من الصلاحية
        const hasPermission = await this.permissionsService.hasPermission(
            user.id,
            user.companyId,
            requiredPermission,
        );

        if (!hasPermission) {
            throw new ForbiddenException(
                `ليس لديك صلاحية: ${requiredPermission}`,
            );
        }

        return true;
    }
}
