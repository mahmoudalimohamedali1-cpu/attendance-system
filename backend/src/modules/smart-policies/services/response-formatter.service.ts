import { Injectable } from '@nestjs/common';

/**
 * 📦 Response Formatter Service
 * توحيد صيغة الاستجابات في كل الـ API
 * 
 * Features:
 * - صيغة استجابة موحدة
 * - دعم الـ pagination
 * - دعم الـ metadata
 * - رسائل النجاح والفشل بالعربي
 */

// ============== Types ==============

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
    meta?: ResponseMeta;
    errors?: ResponseError[];
    timestamp: string;
}

export interface ResponseMeta {
    requestId?: string;
    duration?: number;
    pagination?: PaginationMeta;
    [key: string]: any;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface ResponseError {
    code: string;
    field?: string;
    message: string;
}

export interface PaginatedData<T> {
    items: T[];
    pagination: PaginationMeta;
}

// ============== Implementation ==============

@Injectable()
export class ResponseFormatterService {
    /**
     * استجابة نجاح
     */
    success<T>(
        data: T,
        message: string = 'تمت العملية بنجاح',
        meta?: ResponseMeta,
    ): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            meta,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * استجابة خطأ
     */
    error(
        message: string,
        errors?: ResponseError[],
        meta?: ResponseMeta,
    ): ApiResponse<null> {
        return {
            success: false,
            message,
            data: null,
            errors,
            meta,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * استجابة مع pagination
     */
    paginated<T>(
        items: T[],
        page: number,
        limit: number,
        total: number,
        message: string = 'تمت العملية بنجاح',
    ): ApiResponse<PaginatedData<T>> {
        const totalPages = Math.ceil(total / limit);
        
        return {
            success: true,
            message,
            data: {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            },
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * استجابة إنشاء
     */
    created<T>(data: T, message: string = 'تم الإنشاء بنجاح'): ApiResponse<T> {
        return this.success(data, message);
    }

    /**
     * استجابة تحديث
     */
    updated<T>(data: T, message: string = 'تم التحديث بنجاح'): ApiResponse<T> {
        return this.success(data, message);
    }

    /**
     * استجابة حذف
     */
    deleted(message: string = 'تم الحذف بنجاح'): ApiResponse<{ deleted: true }> {
        return this.success({ deleted: true }, message);
    }

    /**
     * استجابة سياسة
     */
    policyResponse(
        policy: any,
        action: 'create' | 'update' | 'delete' | 'activate' | 'deactivate',
    ): ApiResponse<any> {
        const messages: Record<string, string> = {
            create: 'تم إنشاء السياسة بنجاح',
            update: 'تم تحديث السياسة بنجاح',
            delete: 'تم حذف السياسة بنجاح',
            activate: 'تم تفعيل السياسة بنجاح',
            deactivate: 'تم إيقاف السياسة بنجاح',
        };

        return this.success(policy, messages[action]);
    }

    /**
     * استجابة تحليل
     */
    analysisResponse(analysis: any): ApiResponse<any> {
        return this.success(analysis, 'تم تحليل السياسة بنجاح');
    }

    /**
     * استجابة محاكاة
     */
    simulationResponse(
        results: any[],
        summary: any,
    ): ApiResponse<{ results: any[]; summary: any }> {
        return this.success(
            { results, summary },
            `تمت المحاكاة بنجاح لـ ${results.length} موظف`,
        );
    }

    /**
     * استجابة موافقة
     */
    approvalResponse(policy: any, action: 'submit' | 'approve' | 'reject'): ApiResponse<any> {
        const messages: Record<string, string> = {
            submit: 'تم إرسال السياسة للموافقة',
            approve: 'تمت الموافقة على السياسة',
            reject: 'تم رفض السياسة',
        };

        return this.success(policy, messages[action]);
    }

    /**
     * استجابة تصدير
     */
    exportResponse(
        data: { filename: string; url?: string; buffer?: Buffer },
    ): ApiResponse<{ filename: string; url?: string }> {
        return this.success(
            { filename: data.filename, url: data.url },
            'تم التصدير بنجاح',
        );
    }

    /**
     * استجابة الأثر الرجعي
     */
    retroResponse(
        application: any,
        action: 'create' | 'calculate' | 'approve' | 'apply' | 'cancel',
    ): ApiResponse<any> {
        const messages: Record<string, string> = {
            create: 'تم إنشاء طلب التطبيق الرجعي',
            calculate: 'تم حساب الفروقات بنجاح',
            approve: 'تمت الموافقة على التطبيق الرجعي',
            apply: 'تم تطبيق الفروقات بنجاح',
            cancel: 'تم إلغاء طلب التطبيق الرجعي',
        };

        return this.success(application, messages[action]);
    }

    /**
     * استجابة إحصائيات
     */
    statsResponse(stats: any): ApiResponse<any> {
        return this.success(stats, 'تم جلب الإحصائيات بنجاح');
    }

    /**
     * استجابة تعارض
     */
    conflictResponse(conflicts: any[]): ApiResponse<{ conflicts: any[]; hasConflicts: boolean }> {
        const hasConflicts = conflicts.length > 0;
        const message = hasConflicts
            ? `تم اكتشاف ${conflicts.length} تعارض`
            : 'لا توجد تعارضات';

        return this.success({ conflicts, hasConflicts }, message);
    }

    /**
     * تحويل pagination query params
     */
    parsePaginationParams(query: any): { page: number; limit: number; skip: number } {
        const page = Math.max(1, parseInt(query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        return { page, limit, skip };
    }

    /**
     * تحويل filter query params
     */
    parseFilterParams(query: any, allowedFilters: string[]): Record<string, any> {
        const filters: Record<string, any> = {};

        for (const key of allowedFilters) {
            if (query[key] !== undefined && query[key] !== '') {
                // تحويل القيم المنطقية
                if (query[key] === 'true') {
                    filters[key] = true;
                } else if (query[key] === 'false') {
                    filters[key] = false;
                } else {
                    filters[key] = query[key];
                }
            }
        }

        return filters;
    }

    /**
     * تحويل sort query params
     */
    parseSortParams(
        query: any,
        allowedFields: string[],
        defaultField: string = 'createdAt',
        defaultOrder: 'asc' | 'desc' = 'desc',
    ): { field: string; order: 'asc' | 'desc' } {
        let field = query.sortBy || defaultField;
        let order = (query.sortOrder?.toLowerCase() || defaultOrder) as 'asc' | 'desc';

        // التحقق من أن الحقل مسموح
        if (!allowedFields.includes(field)) {
            field = defaultField;
        }

        // التحقق من أن الترتيب صحيح
        if (!['asc', 'desc'].includes(order)) {
            order = defaultOrder;
        }

        return { field, order };
    }
}

// ============== Exported Helpers ==============

/**
 * إنشاء pagination meta
 */
export function createPaginationMeta(
    page: number,
    limit: number,
    total: number,
): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    
    return {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

/**
 * تحويل Prisma orderBy
 */
export function createOrderBy(
    field: string,
    order: 'asc' | 'desc',
): Record<string, 'asc' | 'desc'> {
    return { [field]: order };
}
