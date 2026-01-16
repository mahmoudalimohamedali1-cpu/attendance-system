"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const geofence_service_1 = require("./services/geofence.service");
const notifications_service_1 = require("../notifications/notifications.service");
const permissions_service_1 = require("../permissions/permissions.service");
const timezone_service_1 = require("../../common/services/timezone.service");
const settings_service_1 = require("../settings/settings.service");
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
const smart_policy_trigger_service_1 = require("../smart-policies/smart-policy-trigger.service");
let AttendanceService = class AttendanceService {
    constructor(prisma, geofenceService, notificationsService, permissionsService, smartPolicyTrigger, timezoneService, settingsService) {
        this.prisma = prisma;
        this.geofenceService = geofenceService;
        this.notificationsService = notificationsService;
        this.permissionsService = permissionsService;
        this.smartPolicyTrigger = smartPolicyTrigger;
        this.timezoneService = timezoneService;
        this.settingsService = settingsService;
        this.FACE_THRESHOLD = 0.6;
    }
    async checkIn(userId, checkInDto) {
        const { latitude, longitude, isMockLocation, deviceInfo, faceEmbedding, faceImage } = checkInDto;
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId: checkInDto.companyId },
            include: { branch: true, department: true, faceData: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        if (!user.branch) {
            throw new common_1.BadRequestException('لم يتم تعيين فرع للموظف');
        }
        const today = this.timezoneService.getLocalToday();
        const workFromHomeRecord = await this.prisma.workFromHome.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
        });
        if (isMockLocation) {
            await this.logSuspiciousAttempt(userId, user.companyId, 'MOCK_LOCATION', latitude, longitude, deviceInfo);
            await this.notifyAdminSuspiciousActivity(user, 'محاولة حضور باستخدام موقع وهمي');
            throw new common_1.ForbiddenException('تم رصد استخدام موقع وهمي. لا يمكن تسجيل الحضور.');
        }
        let distance = 0;
        if (!workFromHomeRecord) {
            const geofenceResult = this.geofenceService.isWithinGeofence(latitude, longitude, Number(user.branch.latitude), Number(user.branch.longitude), user.branch.geofenceRadius);
            distance = geofenceResult.distance;
            if (!geofenceResult.isWithin) {
                await this.logSuspiciousAttempt(userId, user.companyId, 'OUT_OF_RANGE', latitude, longitude, deviceInfo, distance);
                throw new common_1.BadRequestException(`لا يمكنك تسجيل الحضور من خارج موقع الشركة. المسافة الحالية: ${distance} متر`);
            }
        }
        const existingAttendance = await this.prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
        });
        if (existingAttendance) {
            if (existingAttendance.checkInTime) {
                throw new common_1.BadRequestException('تم تسجيل الحضور مسبقاً لهذا اليوم');
            }
            console.warn(`Inconsistent attendance record for user ${userId}: exists but no checkInTime`);
            throw new common_1.BadRequestException('يوجد سجل حضور غير مكتمل، يرجى التواصل مع الدعم');
        }
        const workStartTime = this.parseTime(user.department?.workStartTime || user.branch.workStartTime);
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = workStartTime.hours * 60 + workStartTime.minutes;
        const MAX_EARLY_CHECKIN_LIMIT = 120;
        const earlyCheckInPeriod = Math.min(user.branch.earlyCheckInPeriod || 30, MAX_EARLY_CHECKIN_LIMIT);
        const earliestCheckIn = startMinutes - earlyCheckInPeriod;
        if (currentMinutes < earliestCheckIn) {
            const waitMinutes = earliestCheckIn - currentMinutes;
            await this.notificationsService.sendNotification(userId, client_1.NotificationType.EARLY_CHECK_IN, 'محاولة حضور مبكر', `لا يمكن تسجيل الحضور قبل ${earlyCheckInPeriod} دقيقة من بداية الدوام. يرجى الانتظار ${waitMinutes} دقيقة.`);
            throw new common_1.BadRequestException(`لا يمكن تسجيل الحضور قبل ${earlyCheckInPeriod} دقيقة من بداية الدوام`);
        }
        let lateMinutes = 0;
        let status = 'PRESENT';
        const graceEndMinutes = startMinutes + user.branch.lateGracePeriod;
        if (currentMinutes > graceEndMinutes) {
            lateMinutes = currentMinutes - startMinutes;
            status = 'LATE';
            await this.notificationsService.sendNotification(userId, client_1.NotificationType.LATE_CHECK_IN, 'تسجيل حضور متأخر', `تم تسجيل حضورك متأخراً بمقدار ${lateMinutes} دقيقة`);
            await this.notifyAdminLateCheckIn(user, lateMinutes);
        }
        if (faceEmbedding) {
            try {
                const currentEmb = Array.isArray(faceEmbedding)
                    ? faceEmbedding
                    : JSON.parse(faceEmbedding);
                if (user.faceRegistered && user.faceData) {
                    const storedEmb = JSON.parse(user.faceData.faceEmbedding);
                    const similarity = this.cosineSimilarity(currentEmb, storedEmb);
                    const similarityPercent = Math.round(similarity * 100);
                    console.log(`🔍 Face verification for check-in: similarity = ${similarityPercent}%`);
                    if (similarity < this.FACE_THRESHOLD) {
                        console.log(`❌ Face verification FAILED: ${similarityPercent}% < ${this.FACE_THRESHOLD * 100}%`);
                        await this.logSuspiciousAttempt(userId, user.companyId, 'FACE_MISMATCH', latitude, longitude, deviceInfo);
                        throw new common_1.ForbiddenException(`الوجه غير مطابق (${similarityPercent}%) - يجب أن يكون التطابق أكثر من ${this.FACE_THRESHOLD * 100}%`);
                    }
                    console.log(`✅ Face verification PASSED: ${similarityPercent}%`);
                    if (faceImage) {
                        await this.prisma.faceData.update({
                            where: { userId },
                            data: {
                                faceImage: faceImage,
                                updatedAt: new Date(),
                            },
                        });
                    }
                }
                else {
                    const updateData = {
                        faceEmbedding: JSON.stringify(currentEmb),
                        updatedAt: new Date(),
                    };
                    if (faceImage) {
                        updateData.faceImage = faceImage;
                    }
                    await this.prisma.faceData.upsert({
                        where: { userId },
                        create: {
                            userId,
                            faceEmbedding: JSON.stringify(currentEmb),
                            faceImage: faceImage || null,
                            imageQuality: 0.8,
                            confidence: 0.8,
                        },
                        update: updateData,
                    });
                    if (!user.faceRegistered) {
                        await this.prisma.user.update({
                            where: { id: userId },
                            data: { faceRegistered: true },
                        });
                    }
                    console.log(`✅ تم تسجيل وجه المستخدم ${userId} لأول مرة`);
                }
            }
            catch (e) {
                if (e instanceof common_1.ForbiddenException)
                    throw e;
                console.error('فشل في التحقق/تسجيل الوجه:', e);
                throw new common_1.BadRequestException('فشل في التحقق من الوجه');
            }
        }
        else if (user.faceRegistered) {
            throw new common_1.BadRequestException('يجب التقاط صورة الوجه للتحقق من الهوية');
        }
        const isHolidayToday = await this.settingsService.isHoliday(today, user.companyId);
        let finalStatus = workFromHomeRecord ? 'WORK_FROM_HOME' : status;
        if (isHolidayToday && !workFromHomeRecord) {
            finalStatus = 'HOLIDAY';
            console.log(`🎉 Employee ${userId} is working on a holiday - will receive overtime rates`);
        }
        const attendance = await this.prisma.attendance.upsert({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
            create: {
                userId,
                companyId: user.companyId,
                branchId: user.branch.id,
                date: today,
                checkInTime: now,
                checkInLatitude: latitude,
                checkInLongitude: longitude,
                checkInDistance: distance,
                status: finalStatus,
                lateMinutes: isHolidayToday ? 0 : lateMinutes,
                isWorkFromHome: !!workFromHomeRecord,
                deviceInfo,
            },
            update: {
                checkInTime: now,
                checkInLatitude: latitude,
                checkInLongitude: longitude,
                checkInDistance: distance,
                status: finalStatus,
                lateMinutes: isHolidayToday ? 0 : lateMinutes,
                isWorkFromHome: !!workFromHomeRecord,
                deviceInfo,
            },
        });
        try {
            const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
            await this.smartPolicyTrigger.triggerEvent({
                employeeId: userId,
                employeeName: `${user.firstName} ${user.lastName}`,
                companyId: user.companyId,
                event: client_2.SmartPolicyTrigger.ATTENDANCE,
                subEvent: "CHECK_IN",
                eventData: {
                    attendanceId: attendance.id,
                    date: new Date().toISOString(),
                    dayOfWeek,
                    lateMinutes,
                    isLate: lateMinutes > 0,
                },
            });
        }
        catch (err) {
            console.error("Error triggering smart policy for check-in:", err);
        }
        return {
            message: 'تم تسجيل الحضور بنجاح',
            attendance,
            lateMinutes,
            isLate: lateMinutes > 0,
        };
    }
    async checkOut(userId, checkOutDto) {
        const { latitude, longitude, isMockLocation, deviceInfo, faceEmbedding } = checkOutDto;
        console.log('=== CHECK-OUT REQUEST ===');
        console.log('userId:', userId);
        console.log('faceEmbedding received:', faceEmbedding ? `YES (${Array.isArray(faceEmbedding) ? faceEmbedding.length : 'string'})` : 'NO');
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId: checkOutDto.companyId },
            include: { branch: true, department: true, faceData: true },
        });
        if (!user || !user.branch) {
            throw new common_1.NotFoundException('المستخدم أو الفرع غير موجود');
        }
        console.log('User faceRegistered:', user.faceRegistered);
        console.log('User faceData exists:', !!user.faceData);
        if (isMockLocation) {
            await this.logSuspiciousAttempt(userId, user.companyId, 'MOCK_LOCATION', latitude, longitude, deviceInfo);
            throw new common_1.ForbiddenException('تم رصد استخدام موقع وهمي. لا يمكن تسجيل الانصراف.');
        }
        if (user.faceRegistered && user.faceData) {
            if (!faceEmbedding) {
                throw new common_1.BadRequestException('يجب التقاط صورة الوجه للتحقق من الهوية');
            }
            try {
                const currentEmb = Array.isArray(faceEmbedding)
                    ? faceEmbedding
                    : JSON.parse(faceEmbedding);
                const storedEmb = JSON.parse(user.faceData.faceEmbedding);
                if (currentEmb.length !== storedEmb.length) {
                    console.error(`❌ Embedding size mismatch: current=${currentEmb.length}, stored=${storedEmb.length}`);
                    throw new common_1.BadRequestException('خطأ في بيانات الوجه - حجم غير متطابق');
                }
                const similarity = this.cosineSimilarity(currentEmb, storedEmb);
                const similarityPercent = Math.round(similarity * 100);
                console.log(`🔍 Face verification for user ${userId}: similarity = ${similarityPercent}%`);
                if (similarity < this.FACE_THRESHOLD) {
                    console.log(`❌ Face verification FAILED: ${similarityPercent}% < ${this.FACE_THRESHOLD * 100}%`);
                    await this.logSuspiciousAttempt(userId, user.companyId, 'FACE_MISMATCH', latitude, longitude, deviceInfo);
                    throw new common_1.ForbiddenException(`الوجه غير مطابق (${similarityPercent}%) - يجب أن يكون التطابق أكثر من ${this.FACE_THRESHOLD * 100}%`);
                }
                console.log(`✅ Face verification PASSED for user ${userId}: ${similarityPercent}%`);
            }
            catch (e) {
                if (e instanceof common_1.ForbiddenException)
                    throw e;
                if (e instanceof common_1.BadRequestException)
                    throw e;
                console.error('Face verification error:', e);
                throw new common_1.BadRequestException('فشل في التحقق من الوجه');
            }
        }
        const today = this.timezoneService.getLocalToday();
        const attendance = await this.prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
        });
        if (!attendance || !attendance.checkInTime) {
            throw new common_1.BadRequestException('لم يتم تسجيل الحضور لهذا اليوم');
        }
        if (attendance.checkOutTime) {
            throw new common_1.BadRequestException('تم تسجيل الانصراف مسبقاً لهذا اليوم');
        }
        let distance = 0;
        if (!attendance.isWorkFromHome) {
            const geofenceResult = this.geofenceService.isWithinGeofence(latitude, longitude, Number(user.branch.latitude), Number(user.branch.longitude), user.branch.geofenceRadius);
            distance = geofenceResult.distance;
            if (!geofenceResult.isWithin) {
                await this.logSuspiciousAttempt(userId, user.companyId, 'OUT_OF_RANGE', latitude, longitude, deviceInfo, distance);
                throw new common_1.BadRequestException(`لا يمكنك تسجيل الانصراف من خارج موقع الشركة. المسافة: ${distance} متر`);
            }
        }
        const workEndTime = this.parseTime(user.department?.workEndTime || user.branch.workEndTime);
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const endMinutes = workEndTime.hours * 60 + workEndTime.minutes;
        let earlyLeaveMinutes = 0;
        let status = attendance.status;
        if (currentMinutes < endMinutes) {
            earlyLeaveMinutes = endMinutes - currentMinutes;
            if (status === 'PRESENT') {
                status = 'EARLY_LEAVE';
            }
            else if (status === 'LATE') {
                status = 'LATE_AND_EARLY';
            }
            await this.notificationsService.sendNotification(userId, client_1.NotificationType.EARLY_CHECK_OUT, 'انصراف مبكر', `تم تسجيل انصرافك مبكراً بمقدار ${earlyLeaveMinutes} دقيقة`);
            await this.notifyAdminEarlyCheckOut(user, earlyLeaveMinutes);
        }
        const checkInTime = new Date(attendance.checkInTime);
        const workingMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);
        const expectedWorkMinutes = (workEndTime.hours * 60 + workEndTime.minutes) -
            (this.parseTime(user.department?.workStartTime || user.branch.workStartTime).hours * 60 +
                this.parseTime(user.department?.workStartTime || user.branch.workStartTime).minutes);
        const overtimeMinutes = Math.max(0, workingMinutes - expectedWorkMinutes);
        const updatedAttendance = await this.prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutTime: now,
                checkOutLatitude: latitude,
                checkOutLongitude: longitude,
                checkOutDistance: distance,
                earlyLeaveMinutes,
                workingMinutes,
                overtimeMinutes,
                status,
            },
        });
        return {
            message: 'تم تسجيل الانصراف بنجاح',
            attendance: updatedAttendance,
            earlyLeaveMinutes,
            isEarlyLeave: earlyLeaveMinutes > 0,
            workingMinutes,
            overtimeMinutes,
        };
    }
    async getTodayAttendance(userId, companyId) {
        const today = this.timezoneService.getLocalToday();
        const attendance = await this.prisma.attendance.findFirst({
            where: {
                userId,
                companyId,
                date: today,
            },
        });
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            include: { branch: true, faceData: true },
        });
        return {
            attendance,
            faceRegistered: user?.faceRegistered || false,
            workSchedule: {
                startTime: user?.branch?.workStartTime,
                endTime: user?.branch?.workEndTime,
                lateGracePeriod: user?.branch?.lateGracePeriod,
                earlyCheckInPeriod: user?.branch?.earlyCheckInPeriod,
            },
        };
    }
    async getAttendanceHistory(userId, companyId, query) {
        const { startDate, endDate, status, page = 1, limit = 30 } = query;
        const where = { userId, companyId };
        if (startDate) {
            where.date = { gte: new Date(startDate) };
        }
        if (endDate) {
            where.date = { ...where.date, lte: new Date(endDate) };
        }
        if (status) {
            where.status = status;
        }
        const [attendances, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                orderBy: { date: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);
        return {
            data: attendances,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getMonthlyStats(userId, companyId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const attendances = await this.prisma.attendance.findMany({
            where: {
                userId,
                companyId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const stats = {
            totalDays: attendances.length,
            presentDays: attendances.filter((a) => a.status === 'PRESENT').length,
            lateDays: attendances.filter((a) => a.status === 'LATE').length,
            earlyLeaveDays: attendances.filter((a) => a.status === 'EARLY_LEAVE').length,
            absentDays: attendances.filter((a) => a.status === 'ABSENT').length,
            workFromHomeDays: attendances.filter((a) => a.status === 'WORK_FROM_HOME').length,
            onLeaveDays: attendances.filter((a) => a.status === 'ON_LEAVE').length,
            totalWorkingMinutes: attendances.reduce((sum, a) => sum + (a.workingMinutes || 0), 0),
            totalOvertimeMinutes: attendances.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0),
            totalLateMinutes: attendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0),
            totalEarlyLeaveMinutes: attendances.reduce((sum, a) => sum + (a.earlyLeaveMinutes || 0), 0),
        };
        return {
            year,
            month,
            stats,
            attendances,
        };
    }
    async getAllAttendance(userId, companyId, query) {
        const { startDate, endDate, date, status, branchId, departmentId, search, page = 1, limit = 50 } = query;
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'ATTENDANCE_VIEW');
        if (accessibleEmployeeIds.length === 0) {
            return {
                data: [],
                pagination: { page, limit, total: 0, totalPages: 0 },
            };
        }
        const where = {
            companyId,
            userId: { in: accessibleEmployeeIds },
        };
        if (date) {
            const [year, month, day] = date.split('-').map(Number);
            const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
            const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
            where.date = { gte: targetDate, lt: nextDay };
        }
        else {
            if (startDate) {
                where.date = { gte: new Date(startDate) };
            }
            if (endDate) {
                where.date = { ...where.date, lte: new Date(endDate) };
            }
        }
        if (status) {
            where.status = status;
        }
        if (branchId) {
            where.branchId = branchId;
        }
        if (departmentId) {
            where.user = { ...where.user, departmentId };
        }
        if (search && search.trim()) {
            where.user = {
                ...where.user,
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { employeeCode: { contains: search, mode: 'insensitive' } },
                ],
            };
        }
        const [attendances, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            jobTitle: true,
                            department: { select: { name: true } },
                        },
                    },
                    branch: { select: { name: true } },
                },
                orderBy: { date: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);
        return {
            data: attendances,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getDailyStats(companyId, date) {
        const targetDate = new Date(date || new Date());
        targetDate.setHours(0, 0, 0, 0);
        const [totalEmployees, attendances] = await Promise.all([
            this.prisma.user.count({ where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' } }),
            this.prisma.attendance.findMany({
                where: { companyId, date: targetDate },
            }),
        ]);
        return {
            date: targetDate,
            totalEmployees,
            presentCount: attendances.filter((a) => a.checkInTime).length,
            lateCount: attendances.filter((a) => a.status === 'LATE').length,
            earlyLeaveCount: attendances.filter((a) => a.status === 'EARLY_LEAVE').length,
            lateAndEarlyCount: attendances.filter((a) => a.status === 'LATE_AND_EARLY').length,
            absentCount: totalEmployees - attendances.filter((a) => a.checkInTime).length,
            workFromHomeCount: attendances.filter((a) => a.isWorkFromHome).length,
        };
    }
    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours, minutes };
    }
    async logSuspiciousAttempt(userId, companyId, attemptType, latitude, longitude, deviceInfo, distance) {
        await this.prisma.suspiciousAttempt.create({
            data: {
                userId,
                companyId,
                attemptType,
                latitude,
                longitude,
                distance,
                deviceInfo,
            },
        });
    }
    async notifyAdminSuspiciousActivity(user, message) {
        const admins = await this.prisma.user.findMany({
            where: {
                role: 'ADMIN',
                companyId: user.companyId,
            },
        });
        for (const admin of admins) {
            await this.notificationsService.sendNotification(admin.id, client_1.NotificationType.SUSPICIOUS_ACTIVITY, 'نشاط مشبوه', `${user.firstName} ${user.lastName}: ${message}`, { userId: user.id, employeeCode: user.employeeCode });
        }
    }
    async notifyAdminLateCheckIn(user, lateMinutes) {
        const admins = await this.prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'MANAGER'] },
                companyId: user.companyId,
            },
        });
        for (const admin of admins) {
            if (admin.id === user.managerId || admin.role === 'ADMIN') {
                await this.notificationsService.sendNotification(admin.id, client_1.NotificationType.LATE_CHECK_IN, 'حضور متأخر', `${user.firstName} ${user.lastName} حضر متأخراً بمقدار ${lateMinutes} دقيقة`, { userId: user.id, employeeCode: user.employeeCode, lateMinutes });
            }
        }
    }
    async notifyAdminEarlyCheckOut(user, earlyLeaveMinutes) {
        const admins = await this.prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'MANAGER'] },
                companyId: user.companyId,
            },
        });
        for (const admin of admins) {
            if (admin.id === user.managerId || admin.role === 'ADMIN') {
                await this.notificationsService.sendNotification(admin.id, client_1.NotificationType.EARLY_CHECK_OUT, 'انصراف مبكر', `${user.firstName} ${user.lastName} انصرف مبكراً بمقدار ${earlyLeaveMinutes} دقيقة`, { userId: user.id, employeeCode: user.employeeCode, earlyLeaveMinutes });
            }
        }
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length || a.length === 0) {
            return 0;
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        if (denominator === 0)
            return 0;
        return dotProduct / denominator;
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        geofence_service_1.GeofenceService,
        notifications_service_1.NotificationsService,
        permissions_service_1.PermissionsService,
        smart_policy_trigger_service_1.SmartPolicyTriggerService,
        timezone_service_1.TimezoneService,
        settings_service_1.SettingsService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map