import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GeofenceService } from './services/geofence.service';
import { IntegrityService } from './services/integrity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { TimezoneService } from '../../common/services/timezone.service';
import { SettingsService } from '../settings/settings.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { AttendanceStatus, NotificationType } from '@prisma/client';
import { SmartPolicyTrigger } from '@prisma/client';
import { SmartPolicyTriggerService } from '../smart-policies/smart-policy-trigger.service';
import { getRamadanWorkSchedule, type BranchRamadanConfig } from './ramadan.helper';

@Injectable()
export class AttendanceService {
  // Configurable face verification threshold (0.0 - 1.0)
  // Increase this value for stricter face matching (recommended: 0.6-0.7)
  private readonly FACE_THRESHOLD = 0.6; // Issue #16: Increased from 0.5 to 0.6 for better security

  constructor(
    private prisma: PrismaService,
    private geofenceService: GeofenceService,
    private integrityService: IntegrityService,
    private notificationsService: NotificationsService,
    private permissionsService: PermissionsService,
    private smartPolicyTrigger: SmartPolicyTriggerService,
    private timezoneService: TimezoneService,
    private settingsService: SettingsService, // For holiday checking
  ) { }

  async checkIn(userId: string, checkInDto: CheckInDto) {
    const { latitude, longitude, isMockLocation, deviceInfo, faceEmbedding, faceImage } = checkInDto;

    // Get user with branch info and company check
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId: checkInDto.companyId },
      include: { branch: true, department: true, faceData: true },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (!user.branch) {
      throw new BadRequestException('لم يتم تعيين فرع للموظف');
    }

    // Get branch timezone and calculate today's date in that timezone
    // جلب المنطقة الزمنية للفرع وحساب تاريخ اليوم
    const timezone = await this.timezoneService.getBranchTimezone(user.branch.id);
    const today = this.getTodayInTimezone(timezone);

    const workFromHomeRecord = await this.prisma.workFromHome.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    // Check mock location
    if (isMockLocation) {
      await this.logSuspiciousAttempt(userId, user.companyId as string, 'MOCK_LOCATION', latitude, longitude, deviceInfo);
      await this.notifyAdminSuspiciousActivity(user, 'محاولة حضور باستخدام موقع وهمي');
      throw new ForbiddenException('تم رصد استخدام موقع وهمي. لا يمكن تسجيل الحضور.');
    }

    // Verify Play Integrity token if provided
    if (checkInDto.integrityToken) {
      try {
        const integrityVerdict = await this.integrityService.verifyIntegrityToken(checkInDto.integrityToken);

        // Log integrity check result
        if (!integrityVerdict.isValid || integrityVerdict.riskLevel === 'HIGH' || integrityVerdict.riskLevel === 'CRITICAL') {
          await this.logSuspiciousAttempt(
            userId,
            user.companyId as string,
            'INTEGRITY_FAILED',
            latitude,
            longitude,
            deviceInfo,
          );

          // Alert HR if risk is high
          if (this.integrityService.shouldAlertHR(integrityVerdict)) {
            await this.notifyAdminSuspiciousActivity(
              user,
              `فشل فحص سلامة الجهاز - مستوى الخطورة: ${integrityVerdict.riskLevel}`,
            );
          }
        }

        // Block attendance if critical risk
        if (this.integrityService.shouldBlockAttendance(integrityVerdict)) {
          throw new ForbiddenException(
            'جهازك لا يلبي معايير الأمان المطلوبة. يرجى استخدام جهاز آخر أو التواصل مع الدعم الفني.',
          );
        }
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        // Silently continue - don't block attendance if integrity check itself fails
      }
    } else if (checkInDto.integrityCheckFailed) {
      // If client couldn't get integrity token, log it
      await this.logSuspiciousAttempt(
        userId,
        user.companyId as string,
        'INTEGRITY_CHECK_UNAVAILABLE',
        latitude,
        longitude,
        deviceInfo,
      );
    }

    // Check geofence (skip if work from home)
    let distance = 0;
    if (!workFromHomeRecord) {
      const geofenceResult = this.geofenceService.isWithinGeofence(
        latitude,
        longitude,
        Number(user.branch.latitude),
        Number(user.branch.longitude),
        user.branch.geofenceRadius,
      );

      distance = geofenceResult.distance;

      if (!geofenceResult.isWithin) {
        await this.logSuspiciousAttempt(
          userId,
          user.companyId as string,
          'OUT_OF_RANGE',
          latitude,
          longitude,
          deviceInfo,
          distance,
        );
        throw new BadRequestException(
          `لا يمكنك تسجيل الحضور من خارج موقع الشركة. المسافة الحالية: ${distance} متر`,
        );
      }
    }

    // Check if already checked in today
    const existingAttendance = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    // Issue #52: Stricter check - reject if attendance record exists at all
    if (existingAttendance) {
      if (existingAttendance.checkInTime) {
        throw new BadRequestException('تم تسجيل الحضور مسبقاً لهذا اليوم');
      }
      // Record exists without checkInTime - this is an inconsistent state, log and reject
      console.warn(`Inconsistent attendance record for user ${userId}: exists but no checkInTime`);
      throw new BadRequestException('يوجد سجل حضور غير مكتمل، يرجى التواصل مع الدعم');
    }

    // Parse work times and get current time in branch timezone
    // حساب الوقت الحالي في المنطقة الزمنية للفرع
    // 🌙 Use Ramadan schedule if enabled
    const branchConfig: BranchRamadanConfig = {
      ramadanModeEnabled: (user.branch as any).ramadanModeEnabled ?? false,
      ramadanWorkHours: (user.branch as any).ramadanWorkHours ?? 6,
      ramadanWorkStartTime: (user.branch as any).ramadanWorkStartTime,
      ramadanWorkEndTime: (user.branch as any).ramadanWorkEndTime,
      workStartTime: user.branch.workStartTime,
      workEndTime: user.branch.workEndTime,
    };
    const ramadanSchedule = getRamadanWorkSchedule(branchConfig, {
      workStartTime: user.department?.workStartTime,
      workEndTime: user.department?.workEndTime,
    });
    const workStartTime = this.parseTime(ramadanSchedule.workStartTime);
    const now = new Date();
    const currentMinutes = this.getCurrentMinutesInTimezone(timezone);
    const startMinutes = workStartTime.hours * 60 + workStartTime.minutes;

    // Check early check-in restriction
    // Issue #44: Clamp earlyCheckInPeriod to max 2 hours (120 minutes) to prevent misconfiguration abuse
    const MAX_EARLY_CHECKIN_LIMIT = 120; // 2 hours maximum
    const earlyCheckInPeriod = Math.min(user.branch.earlyCheckInPeriod || 30, MAX_EARLY_CHECKIN_LIMIT);
    const earliestCheckIn = startMinutes - earlyCheckInPeriod;

    if (currentMinutes < earliestCheckIn) {
      const waitMinutes = earliestCheckIn - currentMinutes;

      // Notify about early check-in attempt
      await this.notificationsService.sendNotification(
        userId,
        NotificationType.EARLY_CHECK_IN,
        'محاولة حضور مبكر',
        `لا يمكن تسجيل الحضور قبل ${earlyCheckInPeriod} دقيقة من بداية الدوام. يرجى الانتظار ${waitMinutes} دقيقة.`,
      );

      throw new BadRequestException(
        `لا يمكن تسجيل الحضور قبل ${earlyCheckInPeriod} دقيقة من بداية الدوام`,
      );
    }

    // Calculate late minutes
    let lateMinutes = 0;
    let status: AttendanceStatus = 'PRESENT';
    const graceEndMinutes = startMinutes + user.branch.lateGracePeriod;

    if (currentMinutes > graceEndMinutes) {
      lateMinutes = currentMinutes - startMinutes;
      status = 'LATE';

      // Notify employee about late check-in
      await this.notificationsService.sendNotification(
        userId,
        NotificationType.LATE_CHECK_IN,
        'تسجيل حضور متأخر',
        `تم تسجيل حضورك متأخراً بمقدار ${lateMinutes} دقيقة`,
      );

      // Notify admin
      await this.notifyAdminLateCheckIn(user, lateMinutes);
    }

    // التحقق من الوجه أو تسجيله
    if (faceEmbedding) {
      try {
        const currentEmb = Array.isArray(faceEmbedding)
          ? faceEmbedding
          : JSON.parse(faceEmbedding as string);

        // إذا كان الوجه مسجلاً، يجب التحقق منه أولاً
        if (user.faceRegistered && user.faceData) {
          const storedEmb = JSON.parse(user.faceData.faceEmbedding);

          // حساب التشابه (Cosine Similarity)
          const similarity = this.cosineSimilarity(currentEmb, storedEmb);
          const similarityPercent = Math.round(similarity * 100);
          console.log(`🔍 Face verification for check-in: similarity = ${similarityPercent}%`);

          if (similarity < this.FACE_THRESHOLD) {
            console.log(`❌ Face verification FAILED: ${similarityPercent}% < ${this.FACE_THRESHOLD * 100}%`);

            // تسجيل محاولة مشبوهة
            await this.logSuspiciousAttempt(
              userId,
              user.companyId as string,
              'FACE_MISMATCH',
              latitude,
              longitude,
              deviceInfo
            );

            throw new ForbiddenException(
              `الوجه غير مطابق (${similarityPercent}%) - يجب أن يكون التطابق أكثر من ${this.FACE_THRESHOLD * 100}%`
            );
          }

          console.log(`✅ Face verification PASSED: ${similarityPercent}%`);

          // تحديث الصورة فقط إذا كانت موجودة (بدون تغيير الـ embedding)
          if (faceImage) {
            await this.prisma.faceData.update({
              where: { userId },
              data: {
                faceImage: faceImage,
                updatedAt: new Date(),
              },
            });
          }
        } else {
          // تسجيل الوجه لأول مرة
          const updateData: any = {
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
      } catch (e) {
        if (e instanceof ForbiddenException) throw e;
        console.error('فشل في التحقق/تسجيل الوجه:', e);
        throw new BadRequestException('فشل في التحقق من الوجه');
      }
    } else if (user.faceRegistered) {
      // إذا كان الوجه مسجلاً ولم يتم إرسال faceEmbedding
      throw new BadRequestException('يجب التقاط صورة الوجه للتحقق من الهوية');
    }


    // 🎉 Check if today is an official holiday for this employee
    const holidayInfo = await this.settingsService.getEmployeeHolidayInfo(today, userId, user.companyId as string);
    const isHolidayToday = holidayInfo.isHoliday;

    // Determine final status (holiday takes precedence over normal status for overtime calculation)
    let finalStatus: AttendanceStatus = workFromHomeRecord ? 'WORK_FROM_HOME' : status;
    if (isHolidayToday && !workFromHomeRecord) {
      finalStatus = 'HOLIDAY' as AttendanceStatus; // Working on holiday = overtime based on multiplier
      const multiplier = holidayInfo.holiday?.overtimeMultiplier || 2;
      console.log(`🎉 Employee ${userId} is working on holiday "${holidayInfo.holiday?.name}" - overtime multiplier: ${multiplier}x`);
    }

    // Create or update attendance record
    const attendance = await this.prisma.attendance.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      create: {
        userId,
        companyId: user.companyId as string,
        branchId: user.branch.id,
        date: today,
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInDistance: distance,
        status: finalStatus,
        lateMinutes: isHolidayToday ? 0 : lateMinutes, // No late penalty on holidays
        isWorkFromHome: !!workFromHomeRecord,
        deviceInfo,
        notes: isHolidayToday ? `عمل في عطلة: ${holidayInfo.holiday?.name}` : undefined,
      },
      update: {
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInDistance: distance,
        status: finalStatus,
        lateMinutes: isHolidayToday ? 0 : lateMinutes, // No late penalty on holidays
        isWorkFromHome: !!workFromHomeRecord,
        deviceInfo,
        notes: isHolidayToday ? `عمل في عطلة: ${holidayInfo.holiday?.name}` : undefined,
      },
    });


    // Trigger smart policies for check-in
    try {
      const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
      await this.smartPolicyTrigger.triggerEvent({
        employeeId: userId,
        employeeName: `${user.firstName} ${user.lastName}`,
        companyId: user.companyId as string,
        event: SmartPolicyTrigger.ATTENDANCE,
        subEvent: "CHECK_IN",
        eventData: {
          attendanceId: attendance.id,
          date: new Date().toISOString(),
          dayOfWeek,
          lateMinutes,
          isLate: lateMinutes > 0,
        },
      });
    } catch (err) {
      console.error("Error triggering smart policy for check-in:", err);
    }

    return {
      message: 'تم تسجيل الحضور بنجاح',
      attendance,
      lateMinutes,
      isLate: lateMinutes > 0,
    };
  }

  async checkOut(userId: string, checkOutDto: CheckOutDto) {
    const { latitude, longitude, isMockLocation, deviceInfo, faceEmbedding } = checkOutDto;

    console.log('=== CHECK-OUT REQUEST ===');
    console.log('userId:', userId);
    console.log('faceEmbedding received:', faceEmbedding ? `YES (${Array.isArray(faceEmbedding) ? faceEmbedding.length : 'string'})` : 'NO');

    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId: checkOutDto.companyId },
      include: { branch: true, department: true, faceData: true },
    });

    if (!user || !user.branch) {
      throw new NotFoundException('المستخدم أو الفرع غير موجود');
    }

    console.log('User faceRegistered:', user.faceRegistered);
    console.log('User faceData exists:', !!user.faceData);

    // Get branch timezone and calculate today's date
    // جلب المنطقة الزمنية للفرع وحساب تاريخ اليوم
    const timezone = await this.timezoneService.getBranchTimezone(user.branch.id);
    const today = this.getTodayInTimezone(timezone);

    // Check mock location
    if (isMockLocation) {
      await this.logSuspiciousAttempt(userId, user.companyId as string, 'MOCK_LOCATION', latitude, longitude, deviceInfo);
      throw new ForbiddenException('تم رصد استخدام موقع وهمي. لا يمكن تسجيل الانصراف.');
    }
    if (checkOutDto.integrityToken) {
      try {
        const integrityVerdict = await this.integrityService.verifyIntegrityToken(checkOutDto.integrityToken);
        // Log integrity check result
        if (!integrityVerdict.isValid || integrityVerdict.riskLevel === 'HIGH' || integrityVerdict.riskLevel === 'CRITICAL') {
          await this.logSuspiciousAttempt(
            userId,
            user.companyId as string,
            'INTEGRITY_FAILED',
            latitude,
            longitude,
            deviceInfo,
          );
          // Alert HR if risk is high
          if (this.integrityService.shouldAlertHR(integrityVerdict)) {
            await this.notifyAdminSuspiciousActivity(
              user,
              `فشل فحص سلامة الجهاز - مستوى الخطورة: ${integrityVerdict.riskLevel}`,
            );
          }
        }
        // Block attendance if critical risk
        if (this.integrityService.shouldBlockAttendance(integrityVerdict)) {
          throw new ForbiddenException(
            'جهازك لا يلبي معايير الأمان المطلوبة. يرجى استخدام جهاز آخر أو التواصل مع الدعم الفني.',
          );
        }
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        // Silently continue - don't block attendance if integrity check itself fails
      }
    } else if (checkOutDto.integrityCheckFailed) {
      // If client couldn't get integrity token, log it
      await this.logSuspiciousAttempt(
        userId,
        user.companyId as string,
        'INTEGRITY_CHECK_UNAVAILABLE',
        latitude,
        longitude,
        deviceInfo,
      );
    }

    // التحقق من الوجه - إجباري إذا كان الوجه مسجلاً
    if (user.faceRegistered && user.faceData) {
      // يجب إرسال الوجه للتحقق
      if (!faceEmbedding) {
        throw new BadRequestException('يجب التقاط صورة الوجه للتحقق من الهوية');
      }

      try {
        const currentEmb = Array.isArray(faceEmbedding)
          ? faceEmbedding
          : JSON.parse(faceEmbedding as string);
        const storedEmb = JSON.parse(user.faceData.faceEmbedding);

        // التحقق من أن الـ embeddings لهما نفس الحجم
        if (currentEmb.length !== storedEmb.length) {
          console.error(`❌ Embedding size mismatch: current=${currentEmb.length}, stored=${storedEmb.length}`);
          throw new BadRequestException('خطأ في بيانات الوجه - حجم غير متطابق');
        }

        // حساب التشابه (Cosine Similarity)
        const similarity = this.cosineSimilarity(currentEmb, storedEmb);
        const similarityPercent = Math.round(similarity * 100);
        console.log(`🔍 Face verification for user ${userId}: similarity = ${similarityPercent}%`);

        if (similarity < this.FACE_THRESHOLD) {
          console.log(`❌ Face verification FAILED: ${similarityPercent}% < ${this.FACE_THRESHOLD * 100}%`);

          // تسجيل محاولة مشبوهة
          await this.logSuspiciousAttempt(
            userId,
            user.companyId as string,
            'FACE_MISMATCH',
            latitude,
            longitude,
            deviceInfo
          );

          throw new ForbiddenException(
            `الوجه غير مطابق (${similarityPercent}%) - يجب أن يكون التطابق أكثر من ${this.FACE_THRESHOLD * 100}%`
          );
        }

        console.log(`✅ Face verification PASSED for user ${userId}: ${similarityPercent}%`);
      } catch (e) {
        if (e instanceof ForbiddenException) throw e;
        if (e instanceof BadRequestException) throw e;
        console.error('Face verification error:', e);
        throw new BadRequestException('فشل في التحقق من الوجه');
      }
    }

    // today already calculated at start of checkOut using branch timezone
    // Get today's attendance
    const attendance = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (!attendance || !attendance.checkInTime) {
      throw new BadRequestException('لم يتم تسجيل الحضور لهذا اليوم');
    }

    if (attendance.checkOutTime) {
      throw new BadRequestException('تم تسجيل الانصراف مسبقاً لهذا اليوم');
    }

    // Check geofence (only if not work from home)
    let distance = 0;
    if (!attendance.isWorkFromHome) {
      const geofenceResult = this.geofenceService.isWithinGeofence(
        latitude,
        longitude,
        Number(user.branch.latitude),
        Number(user.branch.longitude),
        user.branch.geofenceRadius,
      );
      distance = geofenceResult.distance;

      if (!geofenceResult.isWithin) {
        await this.logSuspiciousAttempt(
          userId,
          user.companyId as string,
          'OUT_OF_RANGE',
          latitude,
          longitude,
          deviceInfo,
          distance,
        );
        throw new BadRequestException(
          `لا يمكنك تسجيل الانصراف من خارج موقع الشركة. المسافة: ${distance} متر`,
        );
      }
    }

    // Calculate working time and early leave in branch timezone
    // حساب الوقت الحالي في المنطقة الزمنية للفرع
    // 🌙 Use Ramadan schedule if enabled
    const branchConfig: BranchRamadanConfig = {
      ramadanModeEnabled: (user.branch as any).ramadanModeEnabled ?? false,
      ramadanWorkHours: (user.branch as any).ramadanWorkHours ?? 6,
      ramadanWorkStartTime: (user.branch as any).ramadanWorkStartTime,
      ramadanWorkEndTime: (user.branch as any).ramadanWorkEndTime,
      workStartTime: user.branch.workStartTime,
      workEndTime: user.branch.workEndTime,
    };
    const ramadanSchedule = getRamadanWorkSchedule(branchConfig, {
      workStartTime: user.department?.workStartTime,
      workEndTime: user.department?.workEndTime,
    });
    const workEndTime = this.parseTime(ramadanSchedule.workEndTime);
    const now = new Date();
    const currentMinutes = this.getCurrentMinutesInTimezone(timezone);
    const endMinutes = workEndTime.hours * 60 + workEndTime.minutes;

    let earlyLeaveMinutes = 0;
    let status = attendance.status;

    if (currentMinutes < endMinutes) {
      earlyLeaveMinutes = endMinutes - currentMinutes;

      // Issue #28-29: Handle combined status properly
      if (status === 'PRESENT') {
        status = 'EARLY_LEAVE';
      } else if (status === 'LATE') {
        // Employee was late AND is leaving early - combined status
        status = 'LATE_AND_EARLY';
      }

      // Notify employee
      await this.notificationsService.sendNotification(
        userId,
        NotificationType.EARLY_CHECK_OUT,
        'انصراف مبكر',
        `تم تسجيل انصرافك مبكراً بمقدار ${earlyLeaveMinutes} دقيقة`,
      );

      // Notify admin
      await this.notifyAdminEarlyCheckOut(user, earlyLeaveMinutes);
    }

    // Calculate working minutes
    const checkInTime = new Date(attendance.checkInTime);
    const workingMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);

    // Calculate overtime using Ramadan-aware expected hours
    const expectedWorkMinutes = ramadanSchedule.expectedWorkMinutes;
    const overtimeMinutes = Math.max(0, workingMinutes - expectedWorkMinutes);

    // Update attendance
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

  async getTodayAttendance(userId: string, companyId: string) {
    // Get user's timezone through their branch
    // جلب المنطقة الزمنية للموظف عبر فرعه
    const timezone = await this.timezoneService.getCompanyTimezoneByUserId(userId);
    const today = this.getTodayInTimezone(timezone);

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

  async getAttendanceHistory(userId: string, companyId: string, query: AttendanceQueryDto) {
    const { startDate, endDate, status, page = 1, limit = 30 } = query;

    const where: any = { userId, companyId };

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

  async getMonthlyStats(userId: string, companyId: string, year: number, month: number) {
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

  // Admin methods
  async getAllAttendance(userId: string, companyId: string, query: AttendanceQueryDto) {
    const { startDate, endDate, date, status, branchId, departmentId, search, page = 1, limit = 50 } = query;

    // Get accessible employee IDs based on ATTENDANCE_VIEW permission
    const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
      userId,
      companyId,
      'ATTENDANCE_VIEW'
    );

    // If no accessible employees, return empty
    if (accessibleEmployeeIds.length === 0) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    const where: any = {
      companyId,
      userId: { in: accessibleEmployeeIds },
    };

    // Handle single date - استخدام UTC لتجنب مشاكل timezone
    if (date) {
      // تحويل التاريخ إلى UTC مباشرة
      const [year, month, day] = date.split('-').map(Number);
      const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
      where.date = { gte: targetDate, lt: nextDay };
    } else {
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

    // Handle search by employee name
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
          branch: { select: { name: true, timezone: true } },
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

  async getDailyStats(companyId: string, date?: Date) {
    // Issue #39: Don't mutate the input parameter - create new date
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
      lateAndEarlyCount: attendances.filter((a) => a.status === 'LATE_AND_EARLY').length, // NEW: Combined status count
      absentCount: totalEmployees - attendances.filter((a) => a.checkInTime).length,
      workFromHomeCount: attendances.filter((a) => a.isWorkFromHome).length,
    };
  }

  // Helper methods
  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  /**
   * الحصول على تاريخ اليوم في منطقة زمنية معينة (بدون وقت)
   * Get today's date in a specific timezone (without time)
   */
  private getTodayInTimezone(timezone: string): Date {
    const now = new Date();
    // Use Intl.DateTimeFormat to get date parts in target timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
    // Return UTC date without time for database comparison
    return new Date(Date.UTC(year, month, day));
  }

  /**
   * الحصول على الوقت الحالي بالدقائق في منطقة زمنية معينة
   * Get current time in minutes in a specific timezone
   */
  private getCurrentMinutesInTimezone(timezone: string): number {
    const now = new Date();
    // Use Intl.DateTimeFormat to get time parts in target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const timeStr = formatter.format(now);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async logSuspiciousAttempt(
    userId: string,
    companyId: string, // Performance fix: Pass directly instead of querying
    attemptType: string,
    latitude: number,
    longitude: number,
    deviceInfo?: string,
    distance?: number,
  ) {
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

  private async notifyAdminSuspiciousActivity(user: any, message: string) {
    // Security fix: Only notify admins from the same company
    const admins = await this.prisma.user.findMany({
      where: {
        role: 'ADMIN',
        companyId: user.companyId, // Scoped to company
      },
    });

    for (const admin of admins) {
      await this.notificationsService.sendNotification(
        admin.id,
        NotificationType.SUSPICIOUS_ACTIVITY,
        'نشاط مشبوه',
        `${user.firstName} ${user.lastName}: ${message}`,
        { userId: user.id, employeeCode: user.employeeCode },
      );
    }
  }

  private async notifyAdminLateCheckIn(user: any, lateMinutes: number) {
    // Security fix: Only notify admins/managers from the same company
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MANAGER'] },
        companyId: user.companyId, // Scoped to company
      },
    });

    for (const admin of admins) {
      if (admin.id === user.managerId || admin.role === 'ADMIN') {
        await this.notificationsService.sendNotification(
          admin.id,
          NotificationType.LATE_CHECK_IN,
          'حضور متأخر',
          `${user.firstName} ${user.lastName} حضر متأخراً بمقدار ${lateMinutes} دقيقة`,
          { userId: user.id, employeeCode: user.employeeCode, lateMinutes },
        );
      }
    }
  }

  private async notifyAdminEarlyCheckOut(user: any, earlyLeaveMinutes: number) {
    // Security fix: Only notify admins/managers from the same company
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MANAGER'] },
        companyId: user.companyId, // Scoped to company
      },
    });

    for (const admin of admins) {
      if (admin.id === user.managerId || admin.role === 'ADMIN') {
        await this.notificationsService.sendNotification(
          admin.id,
          NotificationType.EARLY_CHECK_OUT,
          'انصراف مبكر',
          `${user.firstName} ${user.lastName} انصرف مبكراً بمقدار ${earlyLeaveMinutes} دقيقة`,
          { userId: user.id, employeeCode: user.employeeCode, earlyLeaveMinutes },
        );
      }
    }
  }

  /**
   * Admin correction of attendance record with audit logging
   * تصحيح إداري لسجل الحضور مع تسجيل في سجل المراجعة
   */
  async adminCorrectAttendance(
    attendanceId: string,
    companyId: string,
    adminId: string,
    newCheckInTime?: string,
    newCheckOutTime?: string,
    correctionReason?: string,
  ) {
    // Validate inputs
    if (!correctionReason || correctionReason.trim().length < 5) {
      throw new BadRequestException('يجب إدخال سبب التعديل (5 أحرف على الأقل)');
    }

    // Find the attendance record
    const attendance = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, companyId },
      include: { user: { include: { branch: true } } },
    });

    if (!attendance) {
      throw new NotFoundException('سجل الحضور غير موجود');
    }

    // Store original values for audit
    const originalCheckIn = attendance.checkInTime;
    const originalCheckOut = attendance.checkOutTime;
    const originalStatus = attendance.status;
    const originalLateMinutes = attendance.lateMinutes;

    // Prepare update data
    const updateData: any = {};

    if (newCheckInTime) {
      updateData.checkInTime = new Date(newCheckInTime);
    }

    if (newCheckOutTime) {
      updateData.checkOutTime = new Date(newCheckOutTime);
    }

    // Recalculate late minutes if check-in time changed
    if (updateData.checkInTime && attendance.user?.branch) {
      const branch = attendance.user.branch;
      const workStartTime = this.parseTime(branch.workStartTime);
      const checkInDate = new Date(updateData.checkInTime);
      const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
      const startMinutes = workStartTime.hours * 60 + workStartTime.minutes;
      const graceEndMinutes = startMinutes + branch.lateGracePeriod;

      if (checkInMinutes > graceEndMinutes) {
        updateData.lateMinutes = checkInMinutes - startMinutes;
        updateData.status = 'LATE';
      } else {
        updateData.lateMinutes = 0;
        // Check if there's early leave
        if (attendance.earlyLeaveMinutes && attendance.earlyLeaveMinutes > 0) {
          updateData.status = 'EARLY_LEAVE';
        } else {
          updateData.status = 'PRESENT';
        }
      }
    }

    // Recalculate working minutes if both times are present
    const effectiveCheckIn = updateData.checkInTime || attendance.checkInTime;
    const effectiveCheckOut = updateData.checkOutTime || attendance.checkOutTime;

    if (effectiveCheckIn && effectiveCheckOut) {
      const workingMs = new Date(effectiveCheckOut).getTime() - new Date(effectiveCheckIn).getTime();
      updateData.workingMinutes = Math.floor(workingMs / 60000);
    }

    // Add correction note (using existing notes field instead of non-existent correction fields)
    const correctionNote = `✏️ تصحيح إداري: ${correctionReason} (بواسطة المسؤول في ${new Date().toLocaleString('ar-SA')})`;
    updateData.notes = attendance.notes
      ? `${attendance.notes}\n${correctionNote}`
      : correctionNote;

    // Update the attendance record
    const updatedAttendance = await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: updateData,
      include: { user: true, branch: true },
    });

    // Create audit log entry
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: adminId,
          companyId,
          action: 'UPDATE',
          entity: 'Attendance',
          entityId: attendanceId,
          oldValue: {
            checkInTime: originalCheckIn,
            checkOutTime: originalCheckOut,
            status: originalStatus,
            lateMinutes: originalLateMinutes,
          },
          newValue: {
            checkInTime: updateData.checkInTime || null,
            checkOutTime: updateData.checkOutTime || null,
            status: updateData.status || null,
            lateMinutes: updateData.lateMinutes || null,
          },
          description: `تصحيح حضور - ${correctionReason}`,
          ipAddress: null,
        },
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the operation if audit log fails
    }

    return {
      message: 'تم تحديث سجل الحضور بنجاح',
      attendance: updatedAttendance,
      changes: {
        checkInTime: { old: originalCheckIn, new: updatedAttendance.checkInTime },
        checkOutTime: { old: originalCheckOut, new: updatedAttendance.checkOutTime },
        status: { old: originalStatus, new: updatedAttendance.status },
        lateMinutes: { old: originalLateMinutes, new: updatedAttendance.lateMinutes },
      },
    };
  }

  // حساب التشابه بين embedding-ين (Cosine Similarity)
  private cosineSimilarity(a: number[], b: number[]): number {
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
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }
}

