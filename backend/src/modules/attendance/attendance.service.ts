import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GeofenceService } from './services/geofence.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { AttendanceStatus, NotificationType } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private geofenceService: GeofenceService,
    private notificationsService: NotificationsService,
  ) {}

  async checkIn(userId: string, checkInDto: CheckInDto) {
    const { latitude, longitude, isMockLocation, deviceInfo, faceEmbedding, faceImage } = checkInDto;

    // Get user with branch info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { branch: true, department: true, faceData: true },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (!user.branch) {
      throw new BadRequestException('لم يتم تعيين فرع للموظف');
    }

    // Check if work from home is enabled for today
    // استخدام التوقيت المحلي (UTC+2)
    const nowForDate = new Date();
    const localDate = new Date(nowForDate.getTime() + (2 * 60 * 60 * 1000)); // UTC+2 (Egypt/Saudi)
    // إنشاء تاريخ اليوم في UTC (بدون وقت)
    const today = new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate()));

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
      await this.logSuspiciousAttempt(userId, 'MOCK_LOCATION', latitude, longitude, deviceInfo);
      await this.notifyAdminSuspiciousActivity(user, 'محاولة حضور باستخدام موقع وهمي');
      throw new ForbiddenException('تم رصد استخدام موقع وهمي. لا يمكن تسجيل الحضور.');
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

    if (existingAttendance?.checkInTime) {
      throw new BadRequestException('تم تسجيل الحضور مسبقاً لهذا اليوم');
    }

    // Parse work times
    const workStartTime = this.parseTime(
      user.department?.workStartTime || user.branch.workStartTime,
    );
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = workStartTime.hours * 60 + workStartTime.minutes;

    // Check early check-in restriction
    const earlyCheckInPeriod = user.branch.earlyCheckInPeriod;
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
          
          // threshold = 0.5 (50%)
          const FACE_THRESHOLD = 0.5;
          
          if (similarity < FACE_THRESHOLD) {
            console.log(`❌ Face verification FAILED: ${similarityPercent}% < ${FACE_THRESHOLD * 100}%`);
            
            // تسجيل محاولة مشبوهة
            await this.logSuspiciousAttempt(
              userId, 
              'FACE_MISMATCH', 
              latitude, 
              longitude, 
              deviceInfo
            );
            
            throw new ForbiddenException(
              `الوجه غير مطابق (${similarityPercent}%) - يجب أن يكون التطابق أكثر من ${FACE_THRESHOLD * 100}%`
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
        branchId: user.branch.id,
        date: today,
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInDistance: distance,
        status: workFromHomeRecord ? 'WORK_FROM_HOME' : status,
        lateMinutes,
        isWorkFromHome: !!workFromHomeRecord,
        deviceInfo,
      },
      update: {
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInDistance: distance,
        status: workFromHomeRecord ? 'WORK_FROM_HOME' : status,
        lateMinutes,
        isWorkFromHome: !!workFromHomeRecord,
        deviceInfo,
      },
    });

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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { branch: true, department: true, faceData: true },
    });

    if (!user || !user.branch) {
      throw new NotFoundException('المستخدم أو الفرع غير موجود');
    }

    console.log('User faceRegistered:', user.faceRegistered);
    console.log('User faceData exists:', !!user.faceData);

    // Check mock location
    if (isMockLocation) {
      await this.logSuspiciousAttempt(userId, 'MOCK_LOCATION', latitude, longitude, deviceInfo);
      throw new ForbiddenException('تم رصد استخدام موقع وهمي. لا يمكن تسجيل الانصراف.');
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
        
        // threshold = 0.5 (50%) - يمكن تعديله حسب الحاجة
        const FACE_THRESHOLD = 0.5;
        
        if (similarity < FACE_THRESHOLD) {
          console.log(`❌ Face verification FAILED: ${similarityPercent}% < ${FACE_THRESHOLD * 100}%`);
          
          // تسجيل محاولة مشبوهة
          await this.logSuspiciousAttempt(
            userId, 
            'FACE_MISMATCH', 
            latitude, 
            longitude, 
            deviceInfo
          );
          
          throw new ForbiddenException(
            `الوجه غير مطابق (${similarityPercent}%) - يجب أن يكون التطابق أكثر من ${FACE_THRESHOLD * 100}%`
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

    // استخدام التوقيت المحلي
    const nowCheckOut = new Date();
    const localDateCheckOut = new Date(nowCheckOut.getTime() + (2 * 60 * 60 * 1000)); // UTC+2
    const today = new Date(Date.UTC(localDateCheckOut.getUTCFullYear(), localDateCheckOut.getUTCMonth(), localDateCheckOut.getUTCDate()));

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

    // Calculate working time and early leave
    const workEndTime = this.parseTime(
      user.department?.workEndTime || user.branch.workEndTime,
    );
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = workEndTime.hours * 60 + workEndTime.minutes;

    let earlyLeaveMinutes = 0;
    let status = attendance.status;

    if (currentMinutes < endMinutes) {
      earlyLeaveMinutes = endMinutes - currentMinutes;
      
      // Update status if it was PRESENT
      if (status === 'PRESENT') {
        status = 'EARLY_LEAVE';
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

    // Calculate overtime
    const expectedWorkMinutes =
      (workEndTime.hours * 60 + workEndTime.minutes) -
      (this.parseTime(user.department?.workStartTime || user.branch.workStartTime).hours * 60 +
        this.parseTime(user.department?.workStartTime || user.branch.workStartTime).minutes);
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

  async getTodayAttendance(userId: string) {
    // استخدام التوقيت المحلي
    const nowToday = new Date();
    const localDateToday = new Date(nowToday.getTime() + (2 * 60 * 60 * 1000)); // UTC+2
    const today = new Date(Date.UTC(localDateToday.getUTCFullYear(), localDateToday.getUTCMonth(), localDateToday.getUTCDate()));

    const attendance = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

  async getAttendanceHistory(userId: string, query: AttendanceQueryDto) {
    const { startDate, endDate, status, page = 1, limit = 30 } = query;

    const where: any = { userId };

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

  async getMonthlyStats(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        userId,
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
      totalWorkingMinutes: attendances.reduce((sum, a) => sum + a.workingMinutes, 0),
      totalOvertimeMinutes: attendances.reduce((sum, a) => sum + a.overtimeMinutes, 0),
      totalLateMinutes: attendances.reduce((sum, a) => sum + a.lateMinutes, 0),
      totalEarlyLeaveMinutes: attendances.reduce((sum, a) => sum + a.earlyLeaveMinutes, 0),
    };

    return {
      year,
      month,
      stats,
      attendances,
    };
  }

  // Admin methods
  async getAllAttendance(query: AttendanceQueryDto) {
    const { startDate, endDate, date, status, branchId, departmentId, search, page = 1, limit = 50 } = query;

    const where: any = {};

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
      where.user = { departmentId };
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

  async getDailyStats(date?: Date) {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    const [totalEmployees, attendances] = await Promise.all([
      this.prisma.user.count({ where: { status: 'ACTIVE', role: 'EMPLOYEE' } }),
      this.prisma.attendance.findMany({
        where: { date: targetDate },
      }),
    ]);

    return {
      date: targetDate,
      totalEmployees,
      presentCount: attendances.filter((a) => a.checkInTime).length,
      lateCount: attendances.filter((a) => a.status === 'LATE').length,
      earlyLeaveCount: attendances.filter((a) => a.status === 'EARLY_LEAVE').length,
      absentCount: totalEmployees - attendances.filter((a) => a.checkInTime).length,
      workFromHomeCount: attendances.filter((a) => a.isWorkFromHome).length,
    };
  }

  // Helper methods
  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  private async logSuspiciousAttempt(
    userId: string,
    attemptType: string,
    latitude: number,
    longitude: number,
    deviceInfo?: string,
    distance?: number,
  ) {
    await this.prisma.suspiciousAttempt.create({
      data: {
        userId,
        attemptType,
        latitude,
        longitude,
        distance,
        deviceInfo,
      },
    });
  }

  private async notifyAdminSuspiciousActivity(user: any, message: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
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
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER'] } },
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
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER'] } },
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

