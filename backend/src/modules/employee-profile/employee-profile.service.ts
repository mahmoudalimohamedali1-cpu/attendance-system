import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DocumentType, NotificationType, ProficiencyLevel } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }

    /**
     * جلب البروفايل الكامل للموظف (يدعم UUID أو employee_code)
     */
    async getFullProfile(userIdOrCode: string, companyId: string, requesterId: string) {
        // فحص إذا كان المدخل UUID أو employee_code
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userIdOrCode);

        // بناء شرط البحث بناءً على نوع المدخل
        const whereClause = isUUID
            ? { id: userIdOrCode, companyId }
            : { employeeCode: userIdOrCode, companyId };

        // جلب المستخدم أولاً للحصول على الـ ID الفعلي
        const foundUser = await this.prisma.user.findFirst({
            where: whereClause,
            select: { id: true },
        });

        if (!foundUser) {
            throw new NotFoundException('الموظف غير موجود');
        }

        const userId = foundUser.id;

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
     * - إذا كان المستخدم ADMIN أو HR، يتم التحديث مباشرة
     * - إذا كان المستخدم EMPLOYEE، يتم إنشاء طلب تحديث يحتاج موافقة HR
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

        if (!requester) {
            throw new ForbiddenException('المستخدم غير موجود');
        }

        // إذا كان القائم بالطلب Admin أو HR أو SuperAdmin، يتم التحديث مباشرة
        if (requester.role === 'ADMIN' || requester.role === 'HR' || requester.isSuperAdmin) {
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

        // إذا كان المستخدم موظف عادي، يتم إنشاء طلبات تحديث للحقول المتغيرة
        // جلب البيانات الحالية للمقارنة
        const currentUser = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!currentUser) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // الحقول المسموح للموظف بطلب تحديثها
        const allowedFieldsForEmployee = [
            'phone', 'alternativePhone', 'emergencyPhone', 'emergencyContactName',
            'address', 'city', 'region', 'postalCode', 'country',
            'maritalStatus', 'bloodType',
        ];

        const updateRequests = [];

        for (const [fieldName, newValue] of Object.entries(data)) {
            // تخطي الحقول غير المسموح بها
            if (!allowedFieldsForEmployee.includes(fieldName)) {
                continue;
            }

            // تخطي القيم الفارغة أو غير المتغيرة
            if (newValue === undefined || newValue === null) {
                continue;
            }

            const currentValue = (currentUser as any)[fieldName];
            const newValueStr = String(newValue);
            const currentValueStr = currentValue ? String(currentValue) : '';

            // إنشاء طلب تحديث فقط إذا كانت القيمة مختلفة
            if (newValueStr !== currentValueStr) {
                updateRequests.push({
                    companyId,
                    userId,
                    updateType: 'PERSONAL_INFO',
                    fieldName,
                    currentValue: currentValueStr || null,
                    requestedValue: newValueStr,
                    status: 'PENDING',
                });
            }
        }

        if (updateRequests.length === 0) {
            throw new BadRequestException('لا توجد تغييرات لطلب تحديثها');
        }

        // إنشاء طلبات التحديث
        await this.prisma.profileUpdateRequest.createMany({
            data: updateRequests,
        });

        // إشعار HR بوجود طلبات تحديث جديدة
        const hrUsers = await this.prisma.user.findMany({
            where: { companyId, role: { in: ['HR', 'ADMIN'] }, status: 'ACTIVE' },
            select: { id: true },
            take: 5,
        });

        const employee = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true },
        });

        for (const hr of hrUsers) {
            await this.notificationsService.sendNotification(
                hr.id,
                NotificationType.GENERAL,
                'طلب تحديث بيانات',
                `${employee?.firstName} ${employee?.lastName} طلب تحديث بيانات البروفايل`,
                { userId, requestCount: updateRequests.length },
            );
        }

        return {
            message: 'تم إرسال طلب التحديث للمراجعة',
            requestCount: updateRequests.length,
            status: 'PENDING',
        };
    }

    /**
     * إنشاء طلب تحديث بيانات البروفايل
     */
    async createProfileUpdateRequest(
        userId: string,
        companyId: string,
        requesterId: string,
        data: {
            fieldName: string;
            requestedValue: string;
            reason?: string;
            reasonAr?: string;
            supportingDocuments?: any;
        },
    ) {
        // التحقق من أن الطالب هو نفس الموظف
        if (userId !== requesterId) {
            const requester = await this.prisma.user.findUnique({
                where: { id: requesterId },
                select: { role: true, isSuperAdmin: true },
            });
            if (!requester || (requester.role !== 'ADMIN' && requester.role !== 'HR' && !requester.isSuperAdmin)) {
                throw new ForbiddenException('لا يمكنك إنشاء طلب تحديث لموظف آخر');
            }
        }

        // التحقق من وجود الموظف
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // التحقق من صحة اسم الحقل
        const validFields = [
            'phone', 'alternativePhone', 'emergencyPhone', 'emergencyContactName',
            'address', 'city', 'region', 'postalCode', 'country',
            'maritalStatus', 'bloodType', 'nationalId', 'iqamaNumber',
            'passportNumber', 'passportExpiryDate', 'iqamaExpiryDate',
        ];

        if (!validFields.includes(data.fieldName)) {
            throw new BadRequestException(`الحقل ${data.fieldName} غير مسموح بتحديثه`);
        }

        // التحقق من عدم وجود طلب معلق لنفس الحقل
        const existingPending = await this.prisma.profileUpdateRequest.findFirst({
            where: {
                userId,
                companyId,
                fieldName: data.fieldName,
                status: 'PENDING',
            },
        });

        if (existingPending) {
            throw new BadRequestException('يوجد طلب تحديث معلق لهذا الحقل بالفعل');
        }

        // جلب القيمة الحالية
        const currentValue = (user as any)[data.fieldName];

        // إنشاء طلب التحديث
        const request = await this.prisma.profileUpdateRequest.create({
            data: {
                companyId,
                userId,
                updateType: 'PERSONAL_INFO',
                fieldName: data.fieldName,
                currentValue: currentValue ? String(currentValue) : null,
                requestedValue: data.requestedValue,
                reason: data.reason,
                reasonAr: data.reasonAr,
                supportingDocuments: data.supportingDocuments,
                status: 'PENDING',
            },
        });

        // إشعار HR
        const hrUsers = await this.prisma.user.findMany({
            where: { companyId, role: { in: ['HR', 'ADMIN'] }, status: 'ACTIVE' },
            select: { id: true },
            take: 5,
        });

        for (const hr of hrUsers) {
            await this.notificationsService.sendNotification(
                hr.id,
                NotificationType.GENERAL,
                'طلب تحديث بيانات جديد',
                `${user.firstName} ${user.lastName} طلب تحديث ${this.getFieldNameAr(data.fieldName)}`,
                { profileUpdateRequestId: request.id, userId },
            );
        }

        return request;
    }

    /**
     * جلب طلبات تحديث البيانات للموظف
     */
    async getMyProfileUpdateRequests(userId: string, companyId: string, status?: string) {
        const where: any = { userId, companyId };
        if (status) where.status = status;

        const requests = await this.prisma.profileUpdateRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                reviewer: {
                    select: { firstName: true, lastName: true },
                },
            },
        });

        return {
            data: requests,
            totalCount: requests.length,
        };
    }

    /**
     * جلب طلبات تحديث البيانات المعلقة (للـ HR/Admin)
     */
    async getPendingProfileUpdateRequests(
        companyId: string,
        requesterId: string,
        page = 1,
        limit = 20,
    ) {
        // التحقق من صلاحيات HR/Admin
        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { role: true, isSuperAdmin: true, companyId: true },
        });

        if (!requester || requester.companyId !== companyId) {
            throw new ForbiddenException('غير مصرح لك');
        }

        if (!['ADMIN', 'HR'].includes(requester.role) && !requester.isSuperAdmin) {
            throw new ForbiddenException('غير مصرح لك بمراجعة طلبات التحديث');
        }

        const where = { companyId, status: 'PENDING' };

        const [requests, total] = await Promise.all([
            this.prisma.profileUpdateRequest.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            avatar: true,
                            department: { select: { name: true } },
                        },
                    },
                },
            }),
            this.prisma.profileUpdateRequest.count({ where }),
        ]);

        return {
            data: requests,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * مراجعة طلب تحديث البيانات (موافقة/رفض)
     */
    async reviewProfileUpdate(
        requestId: string,
        companyId: string,
        reviewerId: string,
        decision: 'APPROVED' | 'REJECTED',
        reviewNote?: string,
        rejectionReason?: string,
    ) {
        // التحقق من صلاحيات HR/Admin
        const reviewer = await this.prisma.user.findUnique({
            where: { id: reviewerId },
            select: { role: true, isSuperAdmin: true, companyId: true, firstName: true, lastName: true },
        });

        if (!reviewer || reviewer.companyId !== companyId) {
            throw new ForbiddenException('غير مصرح لك');
        }

        if (!['ADMIN', 'HR'].includes(reviewer.role) && !reviewer.isSuperAdmin) {
            throw new ForbiddenException('غير مصرح لك بمراجعة طلبات التحديث');
        }

        // جلب طلب التحديث
        const request = await this.prisma.profileUpdateRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: true },
        });

        if (!request) {
            throw new NotFoundException('طلب التحديث غير موجود');
        }

        if (request.status !== 'PENDING') {
            throw new BadRequestException('هذا الطلب تمت مراجعته مسبقاً');
        }

        if (decision === 'APPROVED') {
            // تطبيق التحديث على بيانات الموظف
            const updateData: any = {};

            // التعامل مع الحقول التي تحتاج تحويل لتاريخ
            if (['passportExpiryDate', 'iqamaExpiryDate', 'dateOfBirth'].includes(request.fieldName)) {
                updateData[request.fieldName] = new Date(request.requestedValue);
            } else {
                updateData[request.fieldName] = request.requestedValue;
            }

            await this.prisma.user.update({
                where: { id: request.userId },
                data: updateData,
            });

            // تحديث حالة الطلب
            await this.prisma.profileUpdateRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    reviewedAt: new Date(),
                    reviewedBy: reviewerId,
                    reviewNote,
                    appliedAt: new Date(),
                },
            });

            // إشعار الموظف
            await this.notificationsService.sendNotification(
                request.userId,
                NotificationType.GENERAL,
                'تمت الموافقة على طلب التحديث',
                `تمت الموافقة على طلب تحديث ${this.getFieldNameAr(request.fieldName)}${reviewNote ? ': ' + reviewNote : ''}`,
                { profileUpdateRequestId: requestId },
            );
        } else {
            // رفض الطلب
            await this.prisma.profileUpdateRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    reviewedAt: new Date(),
                    reviewedBy: reviewerId,
                    reviewNote,
                    rejectionReason,
                },
            });

            // إشعار الموظف
            await this.notificationsService.sendNotification(
                request.userId,
                NotificationType.GENERAL,
                'تم رفض طلب التحديث',
                `تم رفض طلب تحديث ${this.getFieldNameAr(request.fieldName)}${rejectionReason ? ': ' + rejectionReason : ''}`,
                { profileUpdateRequestId: requestId },
            );
        }

        // تسجيل في سجل الموافقات
        await this.prisma.approvalLog.create({
            data: {
                companyId,
                requestType: 'PROFILE_UPDATE',
                requestId,
                step: 'HR',
                decision,
                notes: reviewNote || rejectionReason,
                byUserId: reviewerId,
            },
        });

        return this.prisma.profileUpdateRequest.findUnique({
            where: { id: requestId },
            include: {
                user: { select: { firstName: true, lastName: true, employeeCode: true } },
                reviewer: { select: { firstName: true, lastName: true } },
            },
        });
    }

    /**
     * الموافقة على طلب تحديث البيانات (اختصار)
     */
    async approveProfileUpdate(requestId: string, reviewerId: string, companyId: string, reviewNote?: string) {
        return this.reviewProfileUpdate(requestId, companyId, reviewerId, 'APPROVED', reviewNote);
    }

    /**
     * رفض طلب تحديث البيانات (اختصار)
     */
    async rejectProfileUpdate(requestId: string, reviewerId: string, companyId: string, rejectionReason?: string) {
        return this.reviewProfileUpdate(requestId, companyId, reviewerId, 'REJECTED', undefined, rejectionReason);
    }

    /**
     * إلغاء طلب تحديث من قبل الموظف
     */
    async cancelProfileUpdateRequest(requestId: string, userId: string, companyId: string) {
        const request = await this.prisma.profileUpdateRequest.findFirst({
            where: { id: requestId, companyId },
        });

        if (!request) {
            throw new NotFoundException('طلب التحديث غير موجود');
        }

        if (request.userId !== userId) {
            throw new ForbiddenException('لا يمكنك إلغاء طلب شخص آخر');
        }

        if (request.status !== 'PENDING') {
            throw new BadRequestException('لا يمكن إلغاء طلب تمت مراجعته');
        }

        await this.prisma.profileUpdateRequest.update({
            where: { id: requestId },
            data: { status: 'CANCELLED' },
        });

        return { message: 'تم إلغاء طلب التحديث' };
    }

    /**
     * جلب ترجمة اسم الحقل بالعربية
     */
    private getFieldNameAr(fieldName: string): string {
        const fieldNames: Record<string, string> = {
            phone: 'رقم الهاتف',
            alternativePhone: 'رقم هاتف بديل',
            emergencyPhone: 'هاتف الطوارئ',
            emergencyContactName: 'اسم جهة اتصال الطوارئ',
            address: 'العنوان',
            city: 'المدينة',
            region: 'المنطقة',
            postalCode: 'الرمز البريدي',
            country: 'البلد',
            maritalStatus: 'الحالة الاجتماعية',
            bloodType: 'فصيلة الدم',
            nationalId: 'رقم الهوية',
            iqamaNumber: 'رقم الإقامة',
            passportNumber: 'رقم الجواز',
            passportExpiryDate: 'تاريخ انتهاء الجواز',
            iqamaExpiryDate: 'تاريخ انتهاء الإقامة',
            dateOfBirth: 'تاريخ الميلاد',
        };
        return fieldNames[fieldName] || fieldName;
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

    // ============ Emergency Contacts Methods ============

    /**
     * جلب جهات الاتصال الطارئة للموظف
     */
    async getEmergencyContacts(userId: string, companyId: string, requesterId: string) {
        // التحقق من الصلاحيات
        await this.checkAccess(userId, companyId, requesterId);

        // التحقق من وجود الموظف
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        const contacts = await this.prisma.emergencyContact.findMany({
            where: { userId },
            orderBy: { priority: 'asc' },
        });

        return {
            contacts,
            totalCount: contacts.length,
            maxContacts: 3,
            canAddMore: contacts.length < 3,
        };
    }

    /**
     * إضافة جهة اتصال طارئة جديدة
     */
    async createEmergencyContact(
        userId: string,
        companyId: string,
        requesterId: string,
        data: {
            name: string;
            nameAr?: string;
            relationship: string;
            phone: string;
            alternatePhone?: string;
            email?: string;
            priority?: number;
            address?: string;
            city?: string;
            country?: string;
        },
    ) {
        // التحقق من صلاحية التعديل
        await this.checkAccess(userId, companyId, requesterId, 'EDIT');

        // التحقق من وجود الموظف
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // التحقق من عدم تجاوز الحد الأقصى (3 جهات اتصال)
        const existingContacts = await this.prisma.emergencyContact.count({
            where: { userId },
        });

        if (existingContacts >= 3) {
            throw new BadRequestException('لا يمكن إضافة أكثر من 3 جهات اتصال طارئة');
        }

        // التحقق من صحة رقم الهاتف
        if (!data.phone || data.phone.trim() === '') {
            throw new BadRequestException('رقم الهاتف مطلوب');
        }

        // التحقق من صحة الاسم
        if (!data.name || data.name.trim() === '') {
            throw new BadRequestException('اسم جهة الاتصال مطلوب');
        }

        // التحقق من صحة نوع العلاقة
        if (!data.relationship || data.relationship.trim() === '') {
            throw new BadRequestException('نوع العلاقة مطلوب');
        }

        // تعيين الأولوية التلقائية
        const priority = data.priority ?? existingContacts + 1;

        // إنشاء جهة الاتصال الطارئة
        const contact = await this.prisma.emergencyContact.create({
            data: {
                userId,
                name: data.name.trim(),
                nameAr: data.nameAr?.trim(),
                relationship: data.relationship.trim(),
                phone: data.phone.trim(),
                alternatePhone: data.alternatePhone?.trim(),
                email: data.email?.trim(),
                priority,
                address: data.address?.trim(),
                city: data.city?.trim(),
                country: data.country?.trim(),
            },
        });

        return contact;
    }

    /**
     * تحديث جهة اتصال طارئة
     */
    async updateEmergencyContact(
        userId: string,
        contactId: string,
        companyId: string,
        requesterId: string,
        data: {
            name?: string;
            nameAr?: string;
            relationship?: string;
            phone?: string;
            alternatePhone?: string;
            email?: string;
            priority?: number;
            address?: string;
            city?: string;
            country?: string;
            isActive?: boolean;
        },
    ) {
        // التحقق من صلاحية التعديل
        await this.checkAccess(userId, companyId, requesterId, 'EDIT');

        // التحقق من وجود الموظف
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // التحقق من وجود جهة الاتصال
        const existingContact = await this.prisma.emergencyContact.findFirst({
            where: { id: contactId, userId },
        });

        if (!existingContact) {
            throw new NotFoundException('جهة الاتصال غير موجودة');
        }

        // تحضير بيانات التحديث
        const updateData: any = {};

        if (data.name !== undefined) {
            if (data.name.trim() === '') {
                throw new BadRequestException('اسم جهة الاتصال لا يمكن أن يكون فارغاً');
            }
            updateData.name = data.name.trim();
        }

        if (data.nameAr !== undefined) updateData.nameAr = data.nameAr?.trim();

        if (data.relationship !== undefined) {
            if (data.relationship.trim() === '') {
                throw new BadRequestException('نوع العلاقة لا يمكن أن يكون فارغاً');
            }
            updateData.relationship = data.relationship.trim();
        }

        if (data.phone !== undefined) {
            if (data.phone.trim() === '') {
                throw new BadRequestException('رقم الهاتف لا يمكن أن يكون فارغاً');
            }
            updateData.phone = data.phone.trim();
        }

        if (data.alternatePhone !== undefined) updateData.alternatePhone = data.alternatePhone?.trim();
        if (data.email !== undefined) updateData.email = data.email?.trim();
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.address !== undefined) updateData.address = data.address?.trim();
        if (data.city !== undefined) updateData.city = data.city?.trim();
        if (data.country !== undefined) updateData.country = data.country?.trim();
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        // تحديث جهة الاتصال
        const updatedContact = await this.prisma.emergencyContact.update({
            where: { id: contactId },
            data: updateData,
        });

        return updatedContact;
    }

    /**
     * حذف جهة اتصال طارئة
     */
    async deleteEmergencyContact(
        userId: string,
        contactId: string,
        companyId: string,
        requesterId: string,
    ) {
        // التحقق من صلاحية التعديل
        await this.checkAccess(userId, companyId, requesterId, 'EDIT');

        // التحقق من وجود الموظف
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // التحقق من وجود جهة الاتصال
        const existingContact = await this.prisma.emergencyContact.findFirst({
            where: { id: contactId, userId },
        });

        if (!existingContact) {
            throw new NotFoundException('جهة الاتصال غير موجودة');
        }

        // حذف جهة الاتصال
        await this.prisma.emergencyContact.delete({
            where: { id: contactId },
        });

        // إعادة ترتيب الأولويات للجهات المتبقية
        const remainingContacts = await this.prisma.emergencyContact.findMany({
            where: { userId },
            orderBy: { priority: 'asc' },
        });

        for (let i = 0; i < remainingContacts.length; i++) {
            if (remainingContacts[i].priority !== i + 1) {
                await this.prisma.emergencyContact.update({
                    where: { id: remainingContacts[i].id },
                    data: { priority: i + 1 },
                });
            }
        }

        return { message: 'تم حذف جهة الاتصال بنجاح' };
    }

    // ============ Skills Management Methods ============

    /**
     * جلب مهارات الموظف
     */
    async getSkills(userId: string, companyId: string, requesterId: string, category?: string) {
        // التحقق من الصلاحيات
        await this.checkAccess(userId, companyId, requesterId);

        // التحقق من وجود الموظف
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // بناء شرط البحث
        const whereClause: any = {
            userId,
            companyId,
        };

        if (category) {
            whereClause.category = category;
        }

        // جلب المهارات
        const skills = await this.prisma.employeeSkill.findMany({
            where: whereClause,
            orderBy: [
                { category: 'asc' },
                { proficiencyLevel: 'desc' },
                { skillName: 'asc' },
            ],
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        // تجميع حسب الفئة
        const byCategory: Record<string, typeof skills> = {};
        skills.forEach((skill) => {
            const cat = skill.category || 'غير مصنف';
            if (!byCategory[cat]) {
                byCategory[cat] = [];
            }
            byCategory[cat].push(skill);
        });

        // إحصائيات المهارات
        const stats = {
            totalSkills: skills.length,
            verifiedSkills: skills.filter((s) => s.isVerified).length,
            expertSkills: skills.filter((s) => s.proficiencyLevel === 'EXPERT').length,
            advancedSkills: skills.filter((s) => s.proficiencyLevel === 'ADVANCED').length,
            intermediateSkills: skills.filter((s) => s.proficiencyLevel === 'INTERMEDIATE').length,
            beginnerSkills: skills.filter((s) => s.proficiencyLevel === 'BEGINNER').length,
            categories: Object.keys(byCategory).length,
        };

        return {
            skills,
            byCategory,
            stats,
            totalCount: skills.length,
        };
    }

    /**
     * إضافة مهارة جديدة للموظف
     */
    async addSkill(
        userId: string,
        companyId: string,
        requesterId: string,
        data: {
            skillName: string;
            skillNameAr?: string;
            category?: string;
            proficiencyLevel?: ProficiencyLevel;
            yearsExperience?: number;
            notes?: string;
        },
    ) {
        // التحقق من صلاحية التعديل
        await this.checkAccess(userId, companyId, requesterId, 'EDIT');

        // التحقق من وجود الموظف
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // التحقق من صحة اسم المهارة
        if (!data.skillName || data.skillName.trim() === '') {
            throw new BadRequestException('اسم المهارة مطلوب');
        }

        // التحقق من عدم وجود نفس المهارة مسبقاً
        const existingSkill = await this.prisma.employeeSkill.findFirst({
            where: {
                userId,
                companyId,
                skillName: {
                    equals: data.skillName.trim(),
                    mode: 'insensitive',
                },
            },
        });

        if (existingSkill) {
            throw new BadRequestException('هذه المهارة موجودة بالفعل');
        }

        // التحقق من صحة مستوى الخبرة
        if (data.proficiencyLevel) {
            const validLevels: ProficiencyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
            if (!validLevels.includes(data.proficiencyLevel)) {
                throw new BadRequestException('مستوى الإتقان غير صالح');
            }
        }

        // التحقق من سنوات الخبرة
        if (data.yearsExperience !== undefined && data.yearsExperience < 0) {
            throw new BadRequestException('سنوات الخبرة لا يمكن أن تكون قيمة سالبة');
        }

        // إنشاء المهارة
        const skill = await this.prisma.employeeSkill.create({
            data: {
                companyId,
                userId,
                skillName: data.skillName.trim(),
                skillNameAr: data.skillNameAr?.trim(),
                category: data.category?.trim(),
                proficiencyLevel: data.proficiencyLevel || 'BEGINNER',
                yearsExperience: data.yearsExperience,
                notes: data.notes?.trim(),
            },
        });

        return skill;
    }

    /**
     * تحديث مهارة الموظف
     */
    async updateSkill(
        userId: string,
        skillId: string,
        companyId: string,
        requesterId: string,
        data: {
            skillName?: string;
            skillNameAr?: string;
            category?: string;
            proficiencyLevel?: ProficiencyLevel;
            yearsExperience?: number;
            notes?: string;
            isVerified?: boolean;
        },
    ) {
        // التحقق من صلاحية التعديل
        await this.checkAccess(userId, companyId, requesterId, 'EDIT');

        // التحقق من وجود الموظف
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // التحقق من وجود المهارة
        const existingSkill = await this.prisma.employeeSkill.findFirst({
            where: { id: skillId, userId, companyId },
        });

        if (!existingSkill) {
            throw new NotFoundException('المهارة غير موجودة');
        }

        // تحضير بيانات التحديث
        const updateData: any = {};

        if (data.skillName !== undefined) {
            if (data.skillName.trim() === '') {
                throw new BadRequestException('اسم المهارة لا يمكن أن يكون فارغاً');
            }

            // التحقق من عدم وجود نفس المهارة مسبقاً (باستثناء المهارة الحالية)
            const duplicateSkill = await this.prisma.employeeSkill.findFirst({
                where: {
                    userId,
                    companyId,
                    skillName: {
                        equals: data.skillName.trim(),
                        mode: 'insensitive',
                    },
                    NOT: { id: skillId },
                },
            });

            if (duplicateSkill) {
                throw new BadRequestException('هذه المهارة موجودة بالفعل');
            }

            updateData.skillName = data.skillName.trim();
        }

        if (data.skillNameAr !== undefined) updateData.skillNameAr = data.skillNameAr?.trim();
        if (data.category !== undefined) updateData.category = data.category?.trim();

        if (data.proficiencyLevel !== undefined) {
            const validLevels: ProficiencyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
            if (!validLevels.includes(data.proficiencyLevel)) {
                throw new BadRequestException('مستوى الإتقان غير صالح');
            }
            updateData.proficiencyLevel = data.proficiencyLevel;
        }

        if (data.yearsExperience !== undefined) {
            if (data.yearsExperience < 0) {
                throw new BadRequestException('سنوات الخبرة لا يمكن أن تكون قيمة سالبة');
            }
            updateData.yearsExperience = data.yearsExperience;
        }

        if (data.notes !== undefined) updateData.notes = data.notes?.trim();

        // التحقق من صلاحية التحقق من المهارة (فقط ADMIN/HR)
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

        // تحديث المهارة
        const updatedSkill = await this.prisma.employeeSkill.update({
            where: { id: skillId },
            data: updateData,
        });

        return updatedSkill;
    }

    /**
     * حذف مهارة الموظف
     */
    async removeSkill(
        userId: string,
        skillId: string,
        companyId: string,
        requesterId: string,
    ) {
        // التحقق من صلاحية التعديل
        await this.checkAccess(userId, companyId, requesterId, 'EDIT');

        // التحقق من وجود الموظف
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // التحقق من وجود المهارة
        const existingSkill = await this.prisma.employeeSkill.findFirst({
            where: { id: skillId, userId, companyId },
        });

        if (!existingSkill) {
            throw new NotFoundException('المهارة غير موجودة');
        }

        // حذف المهارة
        await this.prisma.employeeSkill.delete({
            where: { id: skillId },
        });

        return { message: 'تم حذف المهارة بنجاح' };
    }

    /**
     * جلب جميع فئات المهارات للشركة
     */
    async getSkillCategories(companyId: string, requesterId: string) {
        // التحقق من صلاحيات المستخدم
        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { role: true, isSuperAdmin: true, companyId: true },
        });

        if (!requester || requester.companyId !== companyId) {
            throw new ForbiddenException('غير مصرح لك');
        }

        // جلب الفئات الفريدة
        const skills = await this.prisma.employeeSkill.findMany({
            where: { companyId },
            select: { category: true },
            distinct: ['category'],
        });

        const categories = skills
            .map((s) => s.category)
            .filter((c): c is string => c !== null && c !== undefined && c.trim() !== '')
            .sort();

        return {
            categories,
            totalCount: categories.length,
        };
    }

    /**
     * جلب الموظفين بمهارة معينة (للمدير/HR)
     */
    async getEmployeesWithSkill(
        companyId: string,
        requesterId: string,
        skillName: string,
        minProficiency?: ProficiencyLevel,
    ) {
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

        // بناء شرط البحث
        const whereClause: any = {
            companyId,
            skillName: {
                contains: skillName,
                mode: 'insensitive',
            },
        };

        // تصفية حسب مستوى الإتقان الأدنى
        if (minProficiency) {
            const proficiencyOrder: ProficiencyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
            const minIndex = proficiencyOrder.indexOf(minProficiency);
            if (minIndex >= 0) {
                whereClause.proficiencyLevel = {
                    in: proficiencyOrder.slice(minIndex),
                };
            }
        }

        const employeeSkills = await this.prisma.employeeSkill.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        avatar: true,
                        jobTitle: true,
                        department: {
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: [
                { proficiencyLevel: 'desc' },
                { yearsExperience: 'desc' },
            ],
        });

        return {
            employees: employeeSkills,
            totalCount: employeeSkills.length,
        };
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
