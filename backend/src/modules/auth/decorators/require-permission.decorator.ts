import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

/**
 * @RequirePermission('CODE') - صلاحية مطلوبة للوصول
 * يستخدم مع PermissionGuard للتحقق من الصلاحيات
 * 
 * @example
 * @RequirePermission('MUDAD_SUBMIT')
 * @UseGuards(PermissionGuard)
 */
export const RequirePermission = (permissionCode: string) =>
    SetMetadata(PERMISSION_KEY, permissionCode);
