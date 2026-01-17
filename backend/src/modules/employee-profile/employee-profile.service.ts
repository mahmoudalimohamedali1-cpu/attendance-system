import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    UpdateProfileDto,
    RequestOnBehalfDto,
    RequestOnBehalfType,
    AttendanceStatsResponse,
    LeaveBalanceResponse,
    SalaryInfoResponse,
    ActivityTimelineItem,
    DocumentTypeEnum,
} from './dto/profile.dto';

@Injectable()
export class EmployeeProfileService {
    constructor(private prisma: PrismaService) { }

    /**
     * جلب البروفايل الكامل للموظف
     */
    async getFullProfile(userId: string, companyId: string, requesterId: string) {
        // التحقق من الصلاحيات
        await this.checkAccess(userId, companyId, requesterId);

        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            include: {
                branch: true,
                department: true,
                jobTitleRef: true,
                costCenter: {
                    select: {
                        id: true,
                        nameAr: true,
                        code: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        email: true,
                        jobTitle: true,
                    },
                },
                contracts: {
                    where: { status: 'ACTIVE' },
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
                bankAccounts: {
                    where: { isPrimary: true },
                    take: 1,
                },
                // employeeDocuments relation removed - model not in schema
                custodyAssignments: {
                    where: { status: 'DELIVERED' },
                    include: {
                        custodyItem: {
                            include: { category: true },
                        },
                    },
                    orderBy: { assignedAt: 'desc' },
                },
                disciplinaryCases: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                customFields: true,
            },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // حساب سنوات الخدمة
        const yearsOfService = user.hireDate
            ? this.calculateYearsOfService(user.hireDate)
            : 0;

        return {
            ...user,
            yearsOfService,
            password: undefined, // إخفاء كلمة المرور
        };
    }

    /**
     * جلب ملخص البروفايل
     */
    async getOverview(userId: string, companyId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
                employeeCode: true,
                jobTitle: true,
                role: true,
                status: true,
                hireDate: true,
                isSaudi: true,
                nationality: true,
                faceRegistered: true,
                remainingLeaveDays: true,
                jobTitleRef: {
                    select: {
                        id: true,
                        name: true,
                        nameEn: true,
                        level: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        nameEn: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        nameEn: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        const yearsOfService = user.hireDate
            ? this.calculateYearsOfService(user.hireDate)
            : 0;

        return { ...user, yearsOfService };
    }

    /**
     * إحصائيات الحضور
     */
    async getAttendanceStats(
        userId: string,
        companyId: string,
        startDate?: string,
        endDate?: string,
    ): Promise<AttendanceStatsResponse> {
        const start = startDate
            ? new Date(startDate)
            : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();

        const attendances = await this.prisma.attendance.findMany({
            where: {
                userId,
                companyId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
        });

        const stats = {
            totalDays: attendances.length,
            presentDays: attendances.filter(
                (a) => a.status === 'PRESENT' || a.status === 'LATE',
            ).length,
            absentDays: attendances.filter((a) => a.status === 'ABSENT').length,
            lateDays: attendances.filter((a) => a.status === 'LATE').length,
            earlyLeaveDays: attendances.filter((a) => a.status === 'EARLY_LEAVE')
                .length,
            workFromHomeDays: attendances.filter((a) => a.isWorkFromHome).length,
            totalWorkingMinutes: attendances.reduce(
                (sum, a) => sum + (a.workingMinutes || 0),
                0,
            ),
            totalOvertimeMinutes: attendances.reduce(
                (sum, a) => sum + (a.overtimeMinutes || 0),
                0,
            ),
            averageCheckInTime: null as string | null,
            averageCheckOutTime: null as string | null,
            attendanceRate: 0,
        };

        // حساب نسبة الحضور
        if (stats.totalDays > 0) {
            stats.attendanceRate = Math.round(
                (stats.presentDays / stats.totalDays) * 100,
            );
        }

        return stats;
    }

    /**
     * سجل الإجازات والأرصدة
     */
    async getLeaveHistory(
        userId: string,
        companyId: string,
    ): Promise<LeaveBalanceResponse & { requests: any[] }> {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: {
                annualLeaveDays: true,
                usedLeaveDays: true,
                remainingLeaveDays: true,
            },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // جلب طلبات الإجازات
        const leaveRequests = await this.prisma.leaveRequest.findMany({
            where: { userId, companyId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        // تجميع حسب النوع
        const leavesByType = leaveRequests.reduce(
            (acc, req) => {
                const existing = acc.find((t) => t.type === req.type);
                if (existing) {
                    if (req.status === 'APPROVED') {
                        existing.used += req.approvedDays || req.requestedDays;
                    } else if (req.status === 'PENDING' || req.status === 'MGR_APPROVED') {
                        existing.pending += req.requestedDays;
                    }
                } else {
                    acc.push({
                        type: req.type,
                        used:
                            req.status === 'APPROVED'
                                ? req.approvedDays || req.requestedDays
                                : 0,
                        pending:
                            req.status === 'PENDING' || req.status === 'MGR_APPROVED'
                                ? req.requestedDays
                                : 0,
                    });
                }
                return acc;
            },
            [] as { type: string; used: number; pending: number }[],
        );

        return {
            annualLeaveDays: user.annualLeaveDays,
            usedLeaveDays: user.usedLeaveDays,
            remainingLeaveDays: user.remainingLeaveDays,
            leavesByType,
            requests: leaveRequests,
        };
    }

    /**
     * بيانات الراتب
     */
    async getSalaryInfo(
        userId: string,
        companyId: string,
    ): Promise<SalaryInfoResponse> {
        // جلب بيانات المستخدم الأساسية
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: {
                salary: true,
                gosiNumber: true,
                bankAccounts: {
                    where: { isPrimary: true },
                    take: 1,
                },
            },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // جلب بيانات GOSI
        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { companyId, isActive: true },
            orderBy: { effectiveDate: 'desc' },
        });

        // جلب تعيين الراتب
        const salaryAssignment = await this.prisma.employeeSalaryAssignment.findFirst({
            where: { employeeId: userId, isActive: true },
            orderBy: { effectiveDate: 'desc' },
        });

        // جلب هيكل الراتب إذا وجد
        let salaryStructure = null;
        if (salaryAssignment?.structureId) {
            const structure = await this.prisma.salaryStructure.findUnique({
                where: { id: salaryAssignment.structureId },
            });
            if (structure) {
                salaryStructure = {
                    id: structure.id,
                    name: structure.name,
                    components: [],
                };
            }
        }

        return {
            basicSalary: user.salary ? Number(user.salary) : null,
            totalSalary: salaryAssignment?.baseSalary
                ? Number(salaryAssignment.baseSalary)
                : Number(user.salary) || null,
            salaryStructure,
            gosiInfo: gosiConfig
                ? {
                    gosiNumber: user.gosiNumber,
                    employeeContribution: gosiConfig.employeeRate
                        ? Number(gosiConfig.employeeRate)
                        : null,
                    employerContribution: gosiConfig.employerRate
                        ? Number(gosiConfig.employerRate)
                        : null,
                }
                : null,
            bankAccount: user.bankAccounts[0]
                ? {
                    bankName: user.bankAccounts[0].bankName,
                    accountNumber: user.bankAccounts[0].iban, // استخدام IBAN كرقم الحساب
                    iban: user.bankAccounts[0].iban,
                }
                : null,
        };
    }

    /**
     * جلب الوثائق
     */
    async getDocuments(userId: string, companyId: string, requesterId?: string, type?: DocumentType) {
        // التحقق من الصلاحيات إذا تم تمرير requesterId
        if (requesterId) {
            await this.checkAccess(userId, companyId, requesterId);
        }

        const whereClause: any = {
            userId,
            companyId,
        };

        if (type) {
            whereClause.type = type;
        }

        // جلب جميع المستندات
        const documents = await this.prisma.employeeDocument.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });

        // تجميع حسب النوع
        const byType: Record<string, typeof documents> = {};
        documents.forEach((doc) => {
            if (!byType[doc.type]) {
                byType[doc.type] = [];
            }
            byType[doc.type].push(doc);
        });

        // جلب المستندات التي ستنتهي صلاحيتها خلال 30 يوم
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringDocuments = documents.filter((doc) => {
            if (!doc.expiryDate) return false;
            const expiryDate = new Date(doc.expiryDate);
            return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
        });

        // جلب المستندات المنتهية الصلاحية
        const expiredDocuments = documents.filter((doc) => {
            if (!doc.expiryDate) return false;
            return new Date(doc.expiryDate) < new Date();
        });

        return {
            documents,
            byType,
            expiringDocuments,
            expiredDocuments,
            totalCount: documents.length,
        };
    }

    /**
     * رفع مستند جديد
     */
    async uploadDocument(
        userId: string,
        companyId: string,
        uploadedById: string,
        data: {
            type: string;
            title: string;
            titleAr?: string;
            description?: string;
            documentNumber?: string;
            issueDate?: string;
            expiryDate?: string;
            issuingAuthority?: string;
            notes?: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            originalName?: string;
        },
    ) {
        // التحقق من صلاحية رفع المستند
        await this.checkAccess(userId, companyId, uploadedById, 'EDIT');

        // التحقق من وجود الموظف
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // التحقق من نوع المستند
        const validTypes = Object.values(DocumentType);
        if (!validTypes.includes(data.type as DocumentType)) {
            throw new BadRequestException('نوع المستند غير صالح');
        }

        // التحقق من حجم الملف (الحد الأقصى 10 ميجابايت)
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        if (data.fileSize > maxFileSize) {
            throw new BadRequestException('حجم الملف يتجاوز الحد المسموح (10 ميجابايت)');
        }

        // التحقق من أنواع الملفات المسموحة
        const allowedFileTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!allowedFileTypes.includes(data.fileType)) {
            throw new BadRequestException('نوع الملف غير مسموح');
        }

        // إنشاء المستند
        const document = await this.prisma.employeeDocument.create({
            data: {
                companyId,
                userId,
                type: data.type as DocumentType,
                title: data.title,
                titleAr: data.titleAr,
                description: data.description,
                documentNumber: data.documentNumber,
                issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
                issuingAuthority: data.issuingAuthority,
                notes: data.notes,
                filePath: data.filePath,
                fileType: data.fileType,
                fileSize: data.fileSize,
                originalName: data.originalName,
                uploadedById,
            },
        });

        return document;
    }

    /**
     * تحديث مستند
     */
    async updateDocument(
        userId: string,
        documentId: string,
        companyId: string,
        requesterId: string,
        data: {
            title?: string;
            titleAr?: string;
            description?: string;
            documentNumber?: string;
            issueDate?: string;
            expiryDate?: string;
            issuingAuthority?: string;
            notes?: string;
            isVerified?: boolean;
        },
    ) {
        // التحقق من الصلاحيات
        await this.checkAccess(userId, companyId, requesterId, 'EDIT');

        // التحقق من وجود المستند
        const document = await this.prisma.employeeDocument.findFirst({
            where: { id: documentId, userId, companyId },
        });

        if (!document) {
            throw new NotFoundException('المستند غير موجود');
        }

        // تحضير بيانات التحديث
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.titleAr !== undefined) updateData.titleAr = data.titleAr;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.documentNumber !== undefined) updateData.documentNumber = data.documentNumber;
        if (data.issueDate !== undefined) updateData.issueDate = new Date(data.issueDate);
        if (data.expiryDate !== undefined) updateData.expiryDate = new Date(data.expiryDate);
        if (data.issuingAuthority !== undefined) updateData.issuingAuthority = data.issuingAuthority;
        if (data.notes !== undefined) updateData.notes = data.notes;

        // التحقق من صلاحية التحقق من المستند
        if (data.isVerified !== undefined) {
            const requester = await this.prisma.user.findUnique({
                where: { id: requesterId },
                select: { role: true, isSuperAdmin: true },
            });

            if (requester && (requester.role === 'ADMIN' || requester.role === 'HR' || requester.isSuperAdmin)) {
                updateData.isVerified = data.isVerified;
                if (data.isVerified) {
                    updateData.verifiedById = requesterId;
                    updateData.verifiedAt = new Date();
                } else {
                    updateData.verifiedById = null;
                    updateData.verifiedAt = null;
                }
            }
        }

        // تحديث المستند
        const updatedDocument = await this.prisma.employeeDocument.update({
            where: { id: documentId },
            data: updateData,
        });

        return updatedDocument;
    }

    /**
     * جلب مستند واحد
     */
    async getDocumentById(userId: string, documentId: string, companyId: string, requesterId: string) {
        // التحقق من الصلاحيات
        await this.checkAccess(userId, companyId, requesterId);

        const document = await this.prisma.employeeDocument.findFirst({
            where: { id: documentId, userId, companyId },
        });

        if (!document) {
            throw new NotFoundException('المستند غير موجود');
        }

        return document;
    }

    /**
     * سجل النشاطات
     */
    async getActivityTimeline(
        userId: string,
        companyId: string,
        limit = 20,
    ): Promise<ActivityTimelineItem[]> {
        const activities: ActivityTimelineItem[] = [];

        // آخر سجلات الحضور
        const attendances = await this.prisma.attendance.findMany({
            where: { userId, companyId },
            orderBy: { date: 'desc' },
            take: 5,
        });

        attendances.forEach((att) => {
            activities.push({
                id: att.id,
                type: 'ATTENDANCE',
                title: `Attendance Record`,
                titleAr: 'سجل حضور',
                description: `${att.status} - ${att.checkInTime ? 'Check-in recorded' : 'No check-in'}`,
                date: att.date,
                status: att.status,
            });
        });

        // آخر طلبات الإجازات
        const leaves = await this.prisma.leaveRequest.findMany({
            where: { userId, companyId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        leaves.forEach((leave) => {
            activities.push({
                id: leave.id,
                type: 'LEAVE',
                title: `Leave Request - ${leave.type}`,
                titleAr: `طلب إجازة - ${this.getLeaveTypeAr(leave.type)}`,
                description: `${leave.requestedDays} days from ${leave.startDate.toLocaleDateString()}`,
                date: leave.createdAt,
                status: leave.status,
            });
        });

        // آخر طلبات الخطابات
        const letters = await this.prisma.letterRequest.findMany({
            where: { userId, companyId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        letters.forEach((letter) => {
            activities.push({
                id: letter.id,
                type: 'LETTER',
                title: `Letter Request - ${letter.type}`,
                titleAr: `طلب خطاب - ${this.getLetterTypeAr(letter.type)}`,
                description: `Requested on ${letter.createdAt.toLocaleDateString()}`,
                date: letter.createdAt,
                status: letter.status,
            });
        });

        // ترتيب حسب التاريخ
        return activities
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, limit);
    }

    /**
     * تحديث بيانات الموظف
     */
    async updateProfile(
        userId: string,
        companyId: string,
        requesterId: string,
        data: UpdateProfileDto,
    ) {
        // التحقق من الصلاحيات
        await this.checkAccess(userId, companyId, requesterId, 'EDIT');

        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { role: true, isSuperAdmin: true },
        });

        // إذا كان القائم بالطلب Admin أو HR، يتم التحديث فورا
        if (!requester) {
            throw new ForbiddenException('المستخدم غير موجود');
        }

        // Always update directly (PROFILE_UPDATE type and newData field not in schema)
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                ...data,
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
                iqamaExpiryDate: data.iqamaExpiryDate
                    ? new Date(data.iqamaExpiryDate)
                    : undefined,
                passportExpiryDate: data.passportExpiryDate
                    ? new Date(data.passportExpiryDate)
                    : undefined,
            },
        });
    }

    /**
     * الموافقة على طلب تحديث البيانات - placeholder since PROFILE_UPDATE not in schema
     */
    async approveProfileUpdate(requestId: string, reviewerId: string, companyId: string) {
        // PROFILE_UPDATE type and newData field not in schema
        throw new BadRequestException('نظام طلبات تحديث البروفايل غير متاح حالياً');
    }

    /**
     * إنشاء طلب بالنيابة
     */
    async createRequestOnBehalf(
        userId: string,
        companyId: string,
        requesterId: string,
        data: RequestOnBehalfDto,
    ) {
        // التحقق من الصلاحيات
        await this.checkAccess(userId, companyId, requesterId, 'MANAGE');

        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        switch (data.requestType) {
            case RequestOnBehalfType.LEAVE:
                if (!data.leaveData) {
                    throw new BadRequestException('بيانات الإجازة مطلوبة');
                }
                return this.createLeaveOnBehalf(userId, companyId, data.leaveData);

            case RequestOnBehalfType.LETTER:
                if (!data.letterData) {
                    throw new BadRequestException('بيانات الخطاب مطلوبة');
                }
                return this.createLetterOnBehalf(userId, companyId, data.letterData);

            case RequestOnBehalfType.ADVANCE:
                if (!data.advanceData) {
                    throw new BadRequestException('بيانات السلفة مطلوبة');
                }
                return this.createAdvanceOnBehalf(userId, companyId, data.advanceData);

            default:
                throw new BadRequestException('نوع الطلب غير صالح');
        }
    }

    // ============ Private Methods ============

    private async checkAccess(
        userId: string,
        companyId: string,
        requesterId: string,
        level: 'VIEW' | 'EDIT' | 'MANAGE' = 'VIEW',
    ) {
        // TODO: فحص الصلاحيات من PermissionsService
        // في الوقت الحالي نسمح بالوصول إذا كان المدير أو نفس المستخدم أو ADMIN
        const requester = await this.prisma.user.findFirst({
            where: { id: requesterId, companyId },
        });

        if (!requester) {
            throw new ForbiddenException('غير مصرح لك');
        }

        // السماح إذا كان نفس المستخدم
        if (userId === requesterId) return;

        // السماح إذا كان ADMIN
        if (requester.role === 'ADMIN' || requester.isSuperAdmin) return;

        // السماح إذا كان المدير المباشر
        const employee = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (employee?.managerId === requesterId) return;

        // السماح إذا كان MANAGER في نفس الفرع/القسم
        if (requester.role === 'MANAGER') {
            if (
                employee?.branchId === requester.branchId ||
                employee?.departmentId === requester.departmentId
            ) {
                return;
            }
        }

        throw new ForbiddenException('غير مصرح لك بالوصول لهذا الملف');
    }

    private calculateYearsOfService(hireDate: Date): number {
        const now = new Date();
        const years =
            (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return Math.floor(years * 10) / 10; // تقريب لعشر واحد
    }

    private getLeaveTypeAr(type: string): string {
        const types: Record<string, string> = {
            ANNUAL: 'سنوية',
            SICK: 'مرضية',
            PERSONAL: 'شخصية',
            EMERGENCY: 'طارئة',
            NEW_BABY: 'مولود جديد',
            MARRIAGE: 'زواج',
            BEREAVEMENT: 'وفاة',
            HAJJ: 'حج',
            EXAM: 'اختبارات',
            WORK_MISSION: 'مهمة عمل',
            UNPAID: 'بدون راتب',
        };
        return types[type] || type;
    }

    private getLetterTypeAr(type: string): string {
        const types: Record<string, string> = {
            SALARY_DEFINITION: 'تعريف راتب',
            SERVICE_CONFIRMATION: 'تأكيد خدمة',
            EXPERIENCE: 'خبرة',
            NOC: 'عدم ممانعة',
            CLEARANCE: 'إخلاء طرف',
        };
        return types[type] || type;
    }

    private async createLeaveOnBehalf(
        userId: string,
        companyId: string,
        data: any,
    ) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        const requestedDays =
            Math.ceil(
                (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
            ) + 1;

        return this.prisma.leaveRequest.create({
            data: {
                userId,
                companyId,
                type: data.type as any,
                startDate,
                endDate,
                requestedDays,
                reason: data.reason,
                notes: data.notes || 'تم الإنشاء بالنيابة عن الموظف',
                status: 'PENDING',
                currentStep: 'MANAGER',
            },
        });
    }

    private async createLetterOnBehalf(
        userId: string,
        companyId: string,
        data: any,
    ) {
        return this.prisma.letterRequest.create({
            data: {
                userId,
                companyId,
                type: data.type as any,
                notes: data.notes || 'تم الإنشاء بالنيابة عن الموظف',
                status: 'PENDING',
                currentStep: 'MANAGER',
            },
        });
    }

    private async createAdvanceOnBehalf(
        userId: string,
        companyId: string,
        data: any,
    ) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + (data.repaymentMonths || 1));
        const monthlyDeduction = data.amount / (data.repaymentMonths || 1);

        return this.prisma.advanceRequest.create({
            data: {
                userId,
                companyId,
                type: 'BANK_TRANSFER',
                amount: data.amount,
                startDate,
                endDate,
                periodMonths: data.repaymentMonths || 1,
                monthlyDeduction,
                notes: data.reason,
                status: 'PENDING',
                currentStep: 'MANAGER',
            },
        });
    }

    /**
     * حذف مستند
     */
    async deleteDocument(userId: string, documentId: string, companyId: string, requesterId: string) {
        // التحقق من الصلاحيات
        await this.checkAccess(userId, companyId, requesterId, 'EDIT');

        // التحقق من وجود المستند
        const document = await this.prisma.employeeDocument.findFirst({
            where: { id: documentId, userId, companyId },
        });

        if (!document) {
            throw new NotFoundException('المستند غير موجود');
        }

        // حذف المستند
        await this.prisma.employeeDocument.delete({
            where: { id: documentId },
        });

        return { message: 'تم حذف المستند بنجاح' };
    }

    /**
     * جلب المستندات المنتهية أو قاربت على الانتهاء لجميع الموظفين (للمدير/HR)
     */
    async getExpiringDocumentsForCompany(companyId: string, requesterId: string, daysUntilExpiry: number = 30) {
        // التحقق من صلاحيات المستخدم
        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { role: true, isSuperAdmin: true, companyId: true },
        });

        if (!requester || requester.companyId !== companyId) {
            throw new ForbiddenException('غير مصرح لك');
        }

        if (!['ADMIN', 'HR', 'MANAGER'].includes(requester.role) && !requester.isSuperAdmin) {
            throw new ForbiddenException('غير مصرح لك بالوصول لهذه البيانات');
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

        const expiringDocuments = await this.prisma.employeeDocument.findMany({
            where: {
                companyId,
                expiryDate: {
                    lte: expiryDate,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: {
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: { expiryDate: 'asc' },
        });

        // تصنيف المستندات
        const now = new Date();
        const expired = expiringDocuments.filter((doc) => new Date(doc.expiryDate!) < now);
        const expiringSoon = expiringDocuments.filter((doc) => new Date(doc.expiryDate!) >= now);

        return {
            expired,
            expiringSoon,
            totalExpired: expired.length,
            totalExpiringSoon: expiringSoon.length,
        };
    }
}
