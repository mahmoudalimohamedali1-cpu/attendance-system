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
var LocationTrackingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationTrackingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const geofence_service_1 = require("../attendance/services/geofence.service");
const notifications_service_1 = require("../notifications/notifications.service");
const permissions_service_1 = require("../permissions/permissions.service");
let LocationTrackingService = LocationTrackingService_1 = class LocationTrackingService {
    constructor(prisma, geofenceService, notificationsService, permissionsService) {
        this.prisma = prisma;
        this.geofenceService = geofenceService;
        this.notificationsService = notificationsService;
        this.permissionsService = permissionsService;
        this.logger = new common_1.Logger(LocationTrackingService_1.name);
        this.LOCATION_UPDATE_INTERVAL = 30;
        this.EXIT_NOTIFICATION_COOLDOWN = 5;
        this.DATA_RETENTION_DAYS = 30;
    }
    async updateLocation(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                branch: true,
                company: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        if (!user.branch) {
            throw new common_1.ForbiddenException('لم يتم تعيين فرع للموظف');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await this.prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
        });
        if (!attendance?.checkInTime || attendance.checkOutTime) {
            throw new common_1.ForbiddenException('لا يمكن تتبع الموقع إلا بعد تسجيل الحضور وقبل الانصراف');
        }
        const geofenceResult = this.geofenceService.isWithinGeofence(dto.latitude, dto.longitude, Number(user.branch.latitude), Number(user.branch.longitude), user.branch.geofenceRadius);
        const isInsideGeofence = geofenceResult.isWithin;
        const distanceFromBranch = geofenceResult.distance;
        const locationLog = await this.prisma.employeeLocationLog.create({
            data: {
                companyId: user.companyId,
                userId,
                latitude: dto.latitude,
                longitude: dto.longitude,
                accuracy: dto.accuracy,
                isInsideGeofence,
                distanceFromBranch,
                batteryLevel: dto.batteryLevel,
                deviceInfo: dto.deviceInfo,
            },
        });
        if (!isInsideGeofence) {
            await this.handleGeofenceExit(user, attendance.id, dto.latitude, dto.longitude, distanceFromBranch);
        }
        else {
            await this.handleGeofenceReturn(user, attendance.id, dto.latitude, dto.longitude);
        }
        return {
            userId,
            latitude: dto.latitude,
            longitude: dto.longitude,
            isInsideGeofence,
            distanceFromBranch,
            accuracy: dto.accuracy,
            batteryLevel: dto.batteryLevel,
            updatedAt: locationLog.createdAt,
        };
    }
    async handleGeofenceExit(user, attendanceId, latitude, longitude, distance) {
        const activeExit = await this.prisma.geofenceExitEvent.findFirst({
            where: {
                userId: user.id,
                attendanceId,
                returnTime: null,
            },
            orderBy: { exitTime: 'desc' },
        });
        if (activeExit) {
            return;
        }
        const exitEvent = await this.prisma.geofenceExitEvent.create({
            data: {
                companyId: user.companyId,
                userId: user.id,
                attendanceId,
                exitLatitude: latitude,
                exitLongitude: longitude,
                distanceFromBranch: distance,
                exitTime: new Date(),
                notificationSent: true,
            },
        });
        await this.notifyManagersOnExit(user, distance, exitEvent.id);
    }
    async handleGeofenceReturn(user, attendanceId, latitude, longitude) {
        const activeExit = await this.prisma.geofenceExitEvent.findFirst({
            where: {
                userId: user.id,
                attendanceId,
                returnTime: null,
            },
            orderBy: { exitTime: 'desc' },
        });
        if (!activeExit) {
            return;
        }
        const exitTime = new Date(activeExit.exitTime);
        const returnTime = new Date();
        const durationMinutes = Math.round((returnTime.getTime() - exitTime.getTime()) / (1000 * 60));
        await this.prisma.geofenceExitEvent.update({
            where: { id: activeExit.id },
            data: {
                returnTime,
                returnLatitude: latitude,
                returnLongitude: longitude,
                durationMinutes,
            },
        });
        await this.notifyManagersOnReturn(user, durationMinutes, activeExit.id);
    }
    async notifyManagersOnExit(user, distance, exitEventId) {
        const userName = `${user.firstName} ${user.lastName}`;
        if (user.managerId) {
            await this.notificationsService.create({
                companyId: user.companyId,
                userId: user.managerId,
                type: 'EMP_EXIT_GEOFENCE',
                title: '⚠️ موظف خرج من نطاق الشركة',
                titleEn: 'Employee Left Company Premises',
                body: `${userName} خرج من نطاق الشركة (المسافة: ${distance} متر)`,
                bodyEn: `${userName} left company premises (Distance: ${distance}m)`,
                entityType: 'GEOFENCE_EXIT',
                entityId: exitEventId,
                data: {
                    userId: user.id,
                    employeeCode: user.employeeCode,
                    distance,
                },
            });
        }
        const admins = await this.prisma.user.findMany({
            where: {
                companyId: user.companyId,
                role: { in: ['ADMIN', 'HR'] },
                status: 'ACTIVE',
                id: { not: user.managerId || '' },
            },
            select: { id: true },
        });
        if (admins.length > 0) {
            await this.notificationsService.createMany(user.companyId, admins.map((a) => a.id), 'EMP_EXIT_GEOFENCE', '⚠️ موظف خرج من نطاق الشركة', `${userName} خرج من نطاق الشركة (المسافة: ${distance} متر)`, 'GEOFENCE_EXIT', exitEventId, { userId: user.id, employeeCode: user.employeeCode, distance });
        }
    }
    async notifyManagersOnReturn(user, durationMinutes, exitEventId) {
        const userName = `${user.firstName} ${user.lastName}`;
        if (user.managerId) {
            await this.notificationsService.create({
                companyId: user.companyId,
                userId: user.managerId,
                type: 'EMP_RETURN_GEOFENCE',
                title: '✅ موظف عاد إلى نطاق الشركة',
                titleEn: 'Employee Returned to Company',
                body: `${userName} عاد إلى نطاق الشركة (مدة الغياب: ${durationMinutes} دقيقة)`,
                bodyEn: `${userName} returned to company (Away: ${durationMinutes} min)`,
                entityType: 'GEOFENCE_EXIT',
                entityId: exitEventId,
                data: {
                    userId: user.id,
                    employeeCode: user.employeeCode,
                    durationMinutes,
                },
            });
        }
        const admins = await this.prisma.user.findMany({
            where: {
                companyId: user.companyId,
                role: { in: ['ADMIN', 'HR'] },
                status: 'ACTIVE',
                id: { not: user.managerId || '' },
            },
            select: { id: true },
        });
        if (admins.length > 0) {
            await this.notificationsService.createMany(user.companyId, admins.map((a) => a.id), 'EMP_RETURN_GEOFENCE', '✅ موظف عاد إلى الشركة', `${userName} عاد إلى نطاق الشركة (مدة الغياب: ${durationMinutes} دقيقة)`, 'GEOFENCE_EXIT', exitEventId, { userId: user.id, employeeCode: user.employeeCode, durationMinutes });
        }
    }
    async getActiveEmployees(companyId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeAttendances = await this.prisma.attendance.findMany({
            where: {
                companyId,
                date: today,
                checkInTime: { not: null },
                checkOutTime: null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { name: true } },
                    },
                },
                branch: { select: { name: true } },
            },
        });
        const result = [];
        for (const attendance of activeAttendances) {
            const lastLocation = await this.prisma.employeeLocationLog.findFirst({
                where: { userId: attendance.userId },
                orderBy: { createdAt: 'desc' },
            });
            const exitEventsCount = await this.prisma.geofenceExitEvent.count({
                where: {
                    userId: attendance.userId,
                    attendanceId: attendance.id,
                },
            });
            result.push({
                id: attendance.user.id,
                firstName: attendance.user.firstName,
                lastName: attendance.user.lastName,
                employeeCode: attendance.user.employeeCode || '',
                branchName: attendance.branch.name,
                departmentName: attendance.user.department?.name,
                checkInTime: attendance.checkInTime,
                lastLocation: lastLocation
                    ? {
                        latitude: Number(lastLocation.latitude),
                        longitude: Number(lastLocation.longitude),
                        isInsideGeofence: lastLocation.isInsideGeofence,
                        distanceFromBranch: lastLocation.distanceFromBranch || 0,
                        updatedAt: lastLocation.createdAt,
                    }
                    : undefined,
                exitEvents: exitEventsCount,
            });
        }
        return result;
    }
    async getEmployeeLocation(requesterId, targetUserId, companyId) {
        const hasPermission = await this.checkTrackingPermission(requesterId, targetUserId, companyId);
        if (!hasPermission) {
            throw new common_1.ForbiddenException('ليس لديك صلاحية تتبع هذا الموظف');
        }
        const lastLocation = await this.prisma.employeeLocationLog.findFirst({
            where: { userId: targetUserId },
            orderBy: { createdAt: 'desc' },
        });
        if (!lastLocation) {
            return null;
        }
        return {
            userId: targetUserId,
            latitude: Number(lastLocation.latitude),
            longitude: Number(lastLocation.longitude),
            isInsideGeofence: lastLocation.isInsideGeofence,
            distanceFromBranch: lastLocation.distanceFromBranch || 0,
            accuracy: lastLocation.accuracy || undefined,
            batteryLevel: lastLocation.batteryLevel || undefined,
            updatedAt: lastLocation.createdAt,
        };
    }
    async getLocationHistory(requesterId, targetUserId, companyId, query) {
        const hasPermission = await this.checkTrackingPermission(requesterId, targetUserId, companyId);
        if (!hasPermission) {
            throw new common_1.ForbiddenException('ليس لديك صلاحية الوصول لسجل هذا الموظف');
        }
        const where = {
            userId: targetUserId,
            companyId,
        };
        if (query.startDate) {
            where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
        }
        if (query.endDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };
        }
        if (query.insideOnly !== undefined) {
            where.isInsideGeofence = query.insideOnly;
        }
        const logs = await this.prisma.employeeLocationLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: query.limit || 100,
        });
        return logs.map((log) => ({
            id: log.id,
            latitude: Number(log.latitude),
            longitude: Number(log.longitude),
            isInsideGeofence: log.isInsideGeofence,
            distanceFromBranch: log.distanceFromBranch,
            accuracy: log.accuracy,
            batteryLevel: log.batteryLevel,
            createdAt: log.createdAt,
        }));
    }
    async getExitEvents(requesterId, targetUserId, companyId, date) {
        const hasPermission = await this.checkTrackingPermission(requesterId, targetUserId, companyId);
        if (!hasPermission) {
            throw new common_1.ForbiddenException('ليس لديك صلاحية الوصول لهذه البيانات');
        }
        const where = {
            userId: targetUserId,
            companyId,
        };
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            where.exitTime = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }
        return this.prisma.geofenceExitEvent.findMany({
            where,
            orderBy: { exitTime: 'desc' },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });
    }
    async checkTrackingPermission(requesterId, targetUserId, companyId) {
        if (requesterId === targetUserId) {
            return true;
        }
        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { role: true, id: true },
        });
        if (!requester) {
            return false;
        }
        if (requester.role === 'ADMIN' || requester.role === 'HR') {
            return true;
        }
        if (requester.role === 'MANAGER') {
            const isManager = await this.prisma.user.count({
                where: {
                    id: targetUserId,
                    managerId: requesterId,
                },
            });
            return isManager > 0;
        }
        return false;
    }
    async cleanOldLocationLogs() {
        this.logger.log('🧹 Starting scheduled cleanup of old location logs...');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.DATA_RETENTION_DAYS);
        try {
            const deletedLogs = await this.prisma.employeeLocationLog.deleteMany({
                where: {
                    createdAt: { lt: cutoffDate },
                },
            });
            const deletedExits = await this.prisma.geofenceExitEvent.deleteMany({
                where: {
                    exitTime: { lt: cutoffDate },
                },
            });
            this.logger.log(`✅ Cleanup complete: Deleted ${deletedLogs.count} location logs and ${deletedExits.count} exit events older than ${this.DATA_RETENTION_DAYS} days`);
        }
        catch (error) {
            this.logger.error('❌ Failed to cleanup old location data:', error);
        }
    }
};
exports.LocationTrackingService = LocationTrackingService;
__decorate([
    (0, schedule_1.Cron)('0 3 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LocationTrackingService.prototype, "cleanOldLocationLogs", null);
exports.LocationTrackingService = LocationTrackingService = LocationTrackingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        geofence_service_1.GeofenceService,
        notifications_service_1.NotificationsService,
        permissions_service_1.PermissionsService])
], LocationTrackingService);
//# sourceMappingURL=location-tracking.service.js.map