import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ApprovalStep, ApprovalRequestType, ApprovalDecision } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface ApprovalContext {
    requestType: ApprovalRequestType;
    amount?: number;
    days?: number;
    companyId: string;
}

@Injectable()
export class ApprovalWorkflowService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * تحديد سلسلة الموافقات المناسبة بناءً على نوع الطلب والمبلغ/المدة
     */
    async getApprovalChain(context: ApprovalContext): Promise<ApprovalStep[]> {
        // جلب جميع الإعدادات النشطة لنوع الطلب
        const configs = await this.prisma.approvalChainConfig.findMany({
            where: {
                companyId: context.companyId,
                requestType: context.requestType,
                isActive: true,
            },
            orderBy: { priority: 'desc' }, // الأعلى أولوية أولاً
        });

        // البحث عن السلسلة المناسبة
        for (const config of configs) {
            let matches = true;

            // التحقق من شروط المبلغ
            if (config.minAmount && context.amount !== undefined) {
                if (context.amount < Number(config.minAmount)) matches = false;
            }
            if (config.maxAmount && context.amount !== undefined) {
                if (context.amount > Number(config.maxAmount)) matches = false;
            }

            // التحقق من شروط الأيام
            if (config.minDays && context.days !== undefined) {
                if (context.days < config.minDays) matches = false;
            }
            if (config.maxDays && context.days !== undefined) {
                if (context.days > config.maxDays) matches = false;
            }

            if (matches) {
                return config.chain as ApprovalStep[];
            }
        }

        // السلسلة الافتراضية إذا لم يتم العثور على مطابقة
        return this.getDefaultChain(context.requestType);
    }

    /**
     * السلسلة الافتراضية لكل نوع طلب
     */
    private getDefaultChain(requestType: ApprovalRequestType): ApprovalStep[] {
        const defaults: Record<ApprovalRequestType, ApprovalStep[]> = {
            LEAVE: [ApprovalStep.MANAGER, ApprovalStep.HR],
            ADVANCE: [ApprovalStep.MANAGER, ApprovalStep.HR, ApprovalStep.FINANCE],
            RAISE: [ApprovalStep.MANAGER, ApprovalStep.HR, ApprovalStep.FINANCE, ApprovalStep.CEO],
            PAYROLL: [ApprovalStep.HR, ApprovalStep.FINANCE, ApprovalStep.CEO],
            WPS: [ApprovalStep.HR, ApprovalStep.FINANCE, ApprovalStep.CEO],
        };
        return defaults[requestType] || [ApprovalStep.MANAGER, ApprovalStep.HR];
    }

    /**
     * الحصول على الخطوة التالية في السلسلة
     */
    getNextStep(chain: ApprovalStep[], currentStep: ApprovalStep): ApprovalStep {
        const currentIndex = chain.indexOf(currentStep);
        if (currentIndex === -1 || currentIndex === chain.length - 1) {
            return ApprovalStep.COMPLETED;
        }
        return chain[currentIndex + 1];
    }

    /**
     * الحصول على الخطوة الأولى في السلسلة
     */
    getFirstStep(chain: ApprovalStep[]): ApprovalStep {
        return chain[0] || ApprovalStep.MANAGER;
    }

    /**
     * التحقق مما إذا كانت السلسلة مكتملة
     */
    isChainComplete(chain: ApprovalStep[], currentStep: ApprovalStep): boolean {
        return currentStep === ApprovalStep.COMPLETED;
    }

    /**
     * التحقق من صحة التحويل بين الخطوات
     */
    validateTransition(chain: ApprovalStep[], fromStep: ApprovalStep, toStep: ApprovalStep): void {
        const fromIndex = chain.indexOf(fromStep);
        const toIndex = chain.indexOf(toStep);

        // التحويل إلى COMPLETED مسموح من أي خطوة في السلسلة (للرفض أو الموافقة النهائية)
        if (toStep === ApprovalStep.COMPLETED) return;

        // التحقق من أن الخطوة التالية صحيحة
        if (toIndex !== fromIndex + 1) {
            throw new BadRequestException(`لا يمكن التحويل من ${fromStep} إلى ${toStep}`);
        }
    }

    /**
     * الحصول على اسم الخطوة بالعربي
     */
    getStepNameAr(step: ApprovalStep): string {
        const names: Record<ApprovalStep, string> = {
            MANAGER: 'المدير المباشر',
            HR: 'الموارد البشرية',
            FINANCE: 'المدير المالي',
            CEO: 'المدير العام',
            COMPLETED: 'مكتمل',
        };
        return names[step] || step;
    }

    /**
     * الحصول على الصلاحية المطلوبة للخطوة
     */
    getPermissionForStep(requestType: ApprovalRequestType, step: ApprovalStep): string {
        return `${requestType}_APPROVE_${step}`;
    }

    /**
     * إنشاء إعدادات سلاسل موافقات افتراضية للشركة
     */
    async createDefaultConfigs(companyId: string): Promise<void> {
        const defaultConfigs = [
            // سلف صغيرة
            {
                requestType: ApprovalRequestType.ADVANCE,
                name: 'سلف صغيرة',
                description: 'سلف أقل من 5000 ريال',
                maxAmount: new Decimal(5000),
                chain: ['MANAGER', 'HR'],
                priority: 10,
            },
            // سلف متوسطة
            {
                requestType: ApprovalRequestType.ADVANCE,
                name: 'سلف متوسطة',
                description: 'سلف من 5000 إلى 20000 ريال',
                minAmount: new Decimal(5000),
                maxAmount: new Decimal(20000),
                chain: ['MANAGER', 'HR', 'FINANCE'],
                priority: 20,
            },
            // سلف كبيرة
            {
                requestType: ApprovalRequestType.ADVANCE,
                name: 'سلف كبيرة',
                description: 'سلف أكثر من 20000 ريال',
                minAmount: new Decimal(20000),
                chain: ['MANAGER', 'HR', 'FINANCE', 'CEO'],
                priority: 30,
            },
            // زيادات الرواتب
            {
                requestType: ApprovalRequestType.RAISE,
                name: 'زيادات الرواتب',
                description: 'جميع طلبات الزيادة',
                chain: ['MANAGER', 'HR', 'FINANCE', 'CEO'],
                priority: 10,
            },
            // إجازة عادية
            {
                requestType: ApprovalRequestType.LEAVE,
                name: 'إجازة عادية',
                description: 'إجازة 14 يوم أو أقل',
                maxDays: 14,
                chain: ['MANAGER', 'HR'],
                priority: 10,
            },
            // إجازة طويلة
            {
                requestType: ApprovalRequestType.LEAVE,
                name: 'إجازة طويلة',
                description: 'إجازة أكثر من 14 يوم',
                minDays: 15,
                chain: ['MANAGER', 'HR', 'CEO'],
                priority: 20,
            },
            // WPS
            {
                requestType: ApprovalRequestType.WPS,
                name: 'تصدير WPS',
                description: 'موافقات تصدير ملفات WPS',
                chain: ['HR', 'FINANCE', 'CEO'],
                priority: 10,
            },
            // Payroll
            {
                requestType: ApprovalRequestType.PAYROLL,
                name: 'دورة الرواتب',
                description: 'موافقات دورة الرواتب',
                chain: ['HR', 'FINANCE', 'CEO'],
                priority: 10,
            },
        ];

        for (const config of defaultConfigs) {
            await this.prisma.approvalChainConfig.create({
                data: {
                    companyId,
                    ...config,
                },
            });
        }
    }
}
