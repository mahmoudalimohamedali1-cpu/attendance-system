import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MuqeemTransactionType, MuqeemResponse } from './interfaces/muqeem.interface';
import { MuqeemTransactionStatus } from '@prisma/client';

@Injectable()
export class MuqeemService {
    private readonly logger = new Logger(MuqeemService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Execute a Muqeem Transaction (Simulated)
     */
    async executeTransaction(
        companyId: string,
        userId: string,
        type: MuqeemTransactionType,
        payload: any,
        createdById?: string,
    ): Promise<MuqeemResponse> {
        // 1. Check Muqeem Configuration
        const config = await this.prisma.muqeemConfig.findUnique({
            where: { companyId },
        });

        if (!config || !config.isActive) {
            throw new BadRequestException('خدمة مقيم غير مفعلة لهذه الشركة. يرجى ضبط الإعدادات أولاً.');
        }

        // 2. Initial Transaction Record (PENDING)
        const transaction = await this.prisma.muqeemTransaction.create({
            data: {
                companyId,
                userId,
                type: type as any,
                status: 'PROCESSING',
                payload,
                createdById,
            },
        });

        try {
            this.logger.log(`Executing Muqeem transaction ${type} for user ${userId}`);

            // 3. Simulate API Call Delay
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // 4. Handle Simulation Logic
            const result = await this.simulateMuqeemResponse(type, payload);

            // 5. Update Transaction with Result
            await this.prisma.muqeemTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: result.success ? 'COMPLETED' : 'FAILED',
                    response: result.data || result.message,
                    externalRef: result.externalRef,
                    fileUrl: result.pdfUrl,
                    executedAt: new Date(),
                    errorMessage: result.success ? null : result.message,
                },
            });

            // 6. Special Handling: Update User Records on Success
            if (result.success) {
                await this.updateUserRecordsAfterMuqeemAction(userId, type, result.data);
            }

            return {
                ...result,
                transactionId: transaction.id,
            };
        } catch (error) {
            this.logger.error(`Muqeem transaction failed: ${type}`, error.stack);

            await this.prisma.muqeemTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'FAILED',
                    errorMessage: error.message,
                },
            });

            return {
                success: false,
                message: error.message,
                transactionId: transaction.id,
            };
        }
    }

    /**
     * Get Muqeem Transactions with stats
     */
    async getTransactions(companyId: string, query: any) {
        const { status, type, userId, page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const where: any = { companyId };
        if (status) where.status = status;
        if (type) where.type = type;
        if (userId) where.userId = userId;

        const [items, total] = await Promise.all([
            this.prisma.muqeemTransaction.findMany({
                where,
                include: {
                    user: { select: { firstName: true, lastName: true, employeeCode: true, nationalId: true } },
                    createdBy: { select: { firstName: true, lastName: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit),
            }),
            this.prisma.muqeemTransaction.count({ where }),
        ]);

        return { items, total, page, limit };
    }

    /**
     * Simulate Muqeem API Behavior
     */
    private async simulateMuqeemResponse(type: MuqeemTransactionType, payload: any): Promise<MuqeemResponse> {
        const success = Math.random() > 0.1; // 90% Success rate for simulation
        const externalRef = `MQ-${Math.random().toString(36).substring(7).toUpperCase()}`;

        if (!success) {
            return {
                success: false,
                message: 'حدث خطأ في منصة مقيم: فشل التحقق من البيانات (محاكاة)',
            };
        }

        let message = 'تمت العملية بنجاح';
        let pdfUrl = null;
        let data = {};

        switch (type) {
            case MuqeemTransactionType.IQAMA_RENEW:
                message = 'تم تجديد الإقامة بنجاح لمدة سنة واحدة';
                data = { newExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) };
                break;
            case MuqeemTransactionType.VISA_EXIT_REENTRY_ISSUE:
                message = 'تم إصدار تأشيرة الخروج والعودة';
                pdfUrl = '/simulated-files/visa-reentry.pdf';
                data = { visaNumber: '600' + Math.floor(Math.random() * 9000000) };
                break;
            case MuqeemTransactionType.PASSPORT_RENEW:
                message = 'تم تحديث بيانات جواز السفر بنجاح';
                data = { passportNumber: 'P' + Math.floor(Math.random() * 9999999) };
                break;
            default:
                message = 'تم تسجيل الإجراء في منصة مقيم بنجاح';
        }

        return { success: true, message, externalRef, pdfUrl, data };
    }

    /**
     * Update User record according to Muqeem success
     */
    private async updateUserRecordsAfterMuqeemAction(userId: string, type: MuqeemTransactionType, data: any) {
        const updateData: any = {};

        if (type === MuqeemTransactionType.IQAMA_RENEW && data.newExpiryDate) {
            updateData.iqamaExpiryDate = data.newExpiryDate;
        }

        if (type === MuqeemTransactionType.PASSPORT_RENEW && data.passportNumber) {
            updateData.passportNumber = data.passportNumber;
        }

        if (Object.keys(updateData).length > 0) {
            await this.prisma.user.update({
                where: { id: userId },
                data: updateData,
            });
        }
    }

    /**
     * Config Management
     */
    async getConfig(companyId: string) {
        const config = await this.prisma.muqeemConfig.findUnique({
            where: { companyId },
        });
        if (!config) throw new NotFoundException('إعدادات مقيم غير موجودة');
        return config;
    }

    async updateConfig(companyId: string, data: any) {
        return this.prisma.muqeemConfig.upsert({
            where: { companyId },
            update: data,
            create: { ...data, companyId },
        });
    }
}
