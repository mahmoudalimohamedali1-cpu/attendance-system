import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TargetType, VisibilityType, Prisma, Role } from '@prisma/client';

// ==================== الواجهات (Interfaces) ====================

/**
 * نتيجة التحقق من الاستهداف
 */
export interface TargetMatchResult {
  isTargeted: boolean;
  reason?: string;
}

/**
 * معاينة الجمهور المستهدف
 */
export interface AudiencePreview {
  totalCount: number;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string | null;
    department?: { id: string; name: string } | null;
    branch?: { id: string; name: string } | null;
  }>;
  breakdown: {
    byDepartment: Array<{ id: string; name: string; count: number }>;
    byBranch: Array<{ id: string; name: string; count: number }>;
    byRole: Array<{ role: string; count: number }>;
  };
}

/**
 * قاعدة استهداف واحدة
 */
export interface TargetRule {
  targetType: TargetType;
  targetValue: string;
  isExclusion?: boolean;
}

/**
 * بيانات المستخدم للتحقق من الاستهداف
 */
interface UserTargetingData {
  id: string;
  role: Role;
  branchId?: string | null;
  departmentId?: string | null;
  jobTitleId?: string | null;
  managerId?: string | null;
  isSaudi?: boolean;
}

@Injectable()
export class TargetingService {
  private readonly logger = new Logger(TargetingService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== التحقق من الاستهداف الأساسي ====================

  /**
   * التحقق إذا كان المستخدم مستهدفاً بمنشور معين
   * يأخذ في الاعتبار نوع الظهور وقواعد الاستهداف
   */
  async isUserTargeted(
    userId: string,
    companyId: string,
    postId: string,
  ): Promise<TargetMatchResult> {
    // جلب بيانات المنشور مع قواعد الاستهداف
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        targets: true,
        author: {
          select: { id: true, departmentId: true, branchId: true },
        },
      },
    });

    if (!post || post.companyId !== companyId) {
      return { isTargeted: false, reason: 'المنشور غير موجود' };
    }

    // جلب بيانات المستخدم
    const user = await this.getUserTargetingData(userId, companyId);
    if (!user) {
      return { isTargeted: false, reason: 'المستخدم غير موجود' };
    }

    // التحقق من نوع الظهور أولاً
    const visibilityResult = await this.checkVisibility(
      user,
      post.visibilityType,
      post.author.departmentId,
    );
    if (!visibilityResult.isTargeted) {
      return visibilityResult;
    }

    // إذا لم تكن هناك قواعد استهداف محددة، المنشور متاح لكل من يمر بفحص الظهور
    if (post.targets.length === 0) {
      return { isTargeted: true, reason: 'لا توجد قواعد استهداف' };
    }

    // فصل قواعد الشمول والاستثناء
    const inclusionRules = post.targets.filter((t) => !t.isExclusion);
    const exclusionRules = post.targets.filter((t) => t.isExclusion);

    // التحقق من الاستثناءات أولاً - إذا كان المستخدم مستثنى، لا يرى المنشور
    for (const rule of exclusionRules) {
      const isExcluded = await this.checkTargetRule(user, rule);
      if (isExcluded) {
        return { isTargeted: false, reason: `مستثنى بقاعدة: ${rule.targetType}` };
      }
    }

    // إذا لم تكن هناك قواعد شمول، المستخدم مستهدف (لم يتم استثناؤه)
    if (inclusionRules.length === 0) {
      return { isTargeted: true, reason: 'لم يتم استثناؤه' };
    }

    // التحقق من قواعد الشمول - يجب أن يطابق واحدة على الأقل
    for (const rule of inclusionRules) {
      const isIncluded = await this.checkTargetRule(user, rule);
      if (isIncluded) {
        return { isTargeted: true, reason: `مطابق لقاعدة: ${rule.targetType}` };
      }
    }

    return { isTargeted: false, reason: 'لا يطابق أي قاعدة استهداف' };
  }

  /**
   * التحقق من نوع الظهور (Visibility)
   */
  private async checkVisibility(
    user: UserTargetingData,
    visibilityType: VisibilityType,
    authorDepartmentId?: string | null,
  ): Promise<TargetMatchResult> {
    switch (visibilityType) {
      case VisibilityType.PUBLIC:
        return { isTargeted: true, reason: 'منشور عام' };

      case VisibilityType.DEPARTMENT:
        // المستخدم في نفس قسم الكاتب
        if (authorDepartmentId && user.departmentId === authorDepartmentId) {
          return { isTargeted: true, reason: 'نفس القسم' };
        }
        return { isTargeted: false, reason: 'ليس في نفس القسم' };

      case VisibilityType.TEAM:
        // المستخدم في فريق الكاتب (مرؤوس مباشر أو زميل)
        // سيتم التحقق من خلال قواعد الاستهداف
        return { isTargeted: true, reason: 'سيتم التحقق من الفريق' };

      case VisibilityType.TARGETED:
        // يعتمد على قواعد الاستهداف
        return { isTargeted: true, reason: 'سيتم التحقق من قواعد الاستهداف' };

      case VisibilityType.MANAGERS_ONLY:
        if (user.role === Role.MANAGER || user.role === Role.ADMIN) {
          return { isTargeted: true, reason: 'مدير أو مسؤول' };
        }
        return { isTargeted: false, reason: 'للمدراء فقط' };

      case VisibilityType.HR_ONLY:
        if (user.role === Role.HR || user.role === Role.ADMIN) {
          return { isTargeted: true, reason: 'موارد بشرية أو مسؤول' };
        }
        return { isTargeted: false, reason: 'للموارد البشرية فقط' };

      case VisibilityType.PRIVATE:
        return { isTargeted: false, reason: 'منشور خاص' };

      default:
        return { isTargeted: true, reason: 'نوع ظهور غير معروف' };
    }
  }

  /**
   * التحقق من قاعدة استهداف واحدة
   */
  private async checkTargetRule(
    user: UserTargetingData,
    rule: { targetType: TargetType; targetValue: string },
  ): Promise<boolean> {
    switch (rule.targetType) {
      case TargetType.USER:
        return user.id === rule.targetValue;

      case TargetType.BRANCH:
        return user.branchId === rule.targetValue;

      case TargetType.DEPARTMENT:
        return user.departmentId === rule.targetValue;

      case TargetType.TEAM:
        // التحقق من أن المستخدم في فريق المدير المحدد
        return await this.isUserInTeam(user.id, rule.targetValue);

      case TargetType.ROLE:
        return user.role === rule.targetValue;

      case TargetType.JOB_TITLE:
        return user.jobTitleId === rule.targetValue;

      case TargetType.GRADE:
        // التحقق من الدرجة الوظيفية
        return await this.isUserInGrade(user.id, rule.targetValue);

      case TargetType.CONTRACT_TYPE:
        // التحقق من نوع العقد
        return await this.isUserContractType(user.id, rule.targetValue);

      case TargetType.SHIFT:
        // التحقق من الوردية - سيتم تطبيقها لاحقاً
        return await this.isUserInShift(user.id, rule.targetValue);

      case TargetType.LOCATION:
        // التحقق من الموقع (يمكن أن يكون الفرع أو موقع جغرافي)
        return user.branchId === rule.targetValue;

      case TargetType.TAG:
        // التحقق من الوسم - يمكن تطبيقها لاحقاً
        return false;

      default:
        this.logger.warn(`نوع استهداف غير مدعوم: ${rule.targetType}`);
        return false;
    }
  }

  // ==================== معاينة الجمهور المستهدف ====================

  /**
   * معاينة الجمهور المستهدف بناءً على قواعد الاستهداف
   */
  async previewTargetAudience(
    companyId: string,
    visibilityType: VisibilityType,
    targets: TargetRule[],
    authorId: string,
    limit: number = 10,
  ): Promise<AudiencePreview> {
    // بناء شرط الاستعلام
    const whereCondition = await this.buildTargetingWhereClause(
      companyId,
      visibilityType,
      targets,
      authorId,
    );

    // جلب المستخدمين المستهدفين
    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          role: true,
          department: {
            select: { id: true, name: true },
          },
          branch: {
            select: { id: true, name: true },
          },
        },
        take: limit,
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.user.count({ where: whereCondition }),
    ]);

    // حساب التوزيع
    const breakdown = await this.calculateAudienceBreakdown(whereCondition);

    return {
      totalCount,
      users,
      breakdown,
    };
  }

  /**
   * الحصول على معرفات المستخدمين المستهدفين
   */
  async getTargetedUserIds(
    companyId: string,
    visibilityType: VisibilityType,
    targets: TargetRule[],
    authorId: string,
  ): Promise<string[]> {
    const whereCondition = await this.buildTargetingWhereClause(
      companyId,
      visibilityType,
      targets,
      authorId,
    );

    const users = await this.prisma.user.findMany({
      where: whereCondition,
      select: { id: true },
    });

    return users.map((u) => u.id);
  }

  /**
   * بناء شرط الاستعلام للاستهداف
   */
  private async buildTargetingWhereClause(
    companyId: string,
    visibilityType: VisibilityType,
    targets: TargetRule[],
    authorId: string,
  ): Promise<Prisma.UserWhereInput> {
    // الشرط الأساسي: المستخدمين النشطين في الشركة
    const baseCondition: Prisma.UserWhereInput = {
      companyId,
      status: 'ACTIVE',
    };

    // بناء شروط الظهور
    const visibilityCondition = await this.buildVisibilityCondition(
      visibilityType,
      authorId,
    );

    // فصل قواعد الشمول والاستثناء
    const inclusionRules = targets.filter((t) => !t.isExclusion);
    const exclusionRules = targets.filter((t) => t.isExclusion);

    // بناء شروط الشمول
    const inclusionConditions: Prisma.UserWhereInput[] = [];
    for (const rule of inclusionRules) {
      const condition = await this.buildRuleCondition(rule);
      if (condition) {
        inclusionConditions.push(condition);
      }
    }

    // بناء شروط الاستثناء
    const exclusionConditions: Prisma.UserWhereInput[] = [];
    for (const rule of exclusionRules) {
      const condition = await this.buildRuleCondition(rule);
      if (condition) {
        exclusionConditions.push(condition);
      }
    }

    // تجميع الشروط
    const finalCondition: Prisma.UserWhereInput = {
      ...baseCondition,
      ...visibilityCondition,
    };

    // إذا كانت هناك قواعد شمول، يجب أن يطابق واحدة على الأقل
    if (inclusionConditions.length > 0) {
      finalCondition.OR = inclusionConditions;
    }

    // إذا كانت هناك قواعد استثناء، يجب ألا يطابق أياً منها
    if (exclusionConditions.length > 0) {
      finalCondition.NOT = {
        OR: exclusionConditions,
      };
    }

    return finalCondition;
  }

  /**
   * بناء شرط الظهور
   */
  private async buildVisibilityCondition(
    visibilityType: VisibilityType,
    authorId: string,
  ): Promise<Prisma.UserWhereInput> {
    switch (visibilityType) {
      case VisibilityType.PUBLIC:
        return {};

      case VisibilityType.DEPARTMENT: {
        const author = await this.prisma.user.findUnique({
          where: { id: authorId },
          select: { departmentId: true },
        });
        if (author?.departmentId) {
          return { departmentId: author.departmentId };
        }
        return {};
      }

      case VisibilityType.TEAM: {
        // الفريق = المرؤوسين المباشرين + الزملاء تحت نفس المدير
        const author = await this.prisma.user.findUnique({
          where: { id: authorId },
          select: { managerId: true },
        });

        const subordinateIds = await this.getSubordinateIds(authorId);
        const colleagueIds = author?.managerId
          ? await this.getColleagueIds(author.managerId, authorId)
          : [];

        const teamIds = [...subordinateIds, ...colleagueIds, authorId];
        return { id: { in: teamIds } };
      }

      case VisibilityType.MANAGERS_ONLY:
        return { role: { in: [Role.MANAGER, Role.ADMIN] } };

      case VisibilityType.HR_ONLY:
        return { role: { in: [Role.HR, Role.ADMIN] } };

      case VisibilityType.PRIVATE:
        return { id: authorId };

      case VisibilityType.TARGETED:
      default:
        return {};
    }
  }

  /**
   * بناء شرط لقاعدة استهداف واحدة
   */
  private async buildRuleCondition(
    rule: TargetRule,
  ): Promise<Prisma.UserWhereInput | null> {
    switch (rule.targetType) {
      case TargetType.USER:
        return { id: rule.targetValue };

      case TargetType.BRANCH:
        return { branchId: rule.targetValue };

      case TargetType.DEPARTMENT:
        return { departmentId: rule.targetValue };

      case TargetType.TEAM: {
        // الفريق = كل المرؤوسين تحت المدير المحدد
        const subordinateIds = await this.getAllSubordinateIds(rule.targetValue);
        return { id: { in: [...subordinateIds, rule.targetValue] } };
      }

      case TargetType.ROLE:
        return { role: rule.targetValue as Role };

      case TargetType.JOB_TITLE:
        return { jobTitleId: rule.targetValue };

      case TargetType.GRADE: {
        // الحصول على مسميات الوظائف بالدرجة المحددة
        const jobTitles = await this.prisma.jobTitle.findMany({
          where: { grade: parseInt(rule.targetValue) || 0 },
          select: { id: true },
        });
        return { jobTitleId: { in: jobTitles.map((j) => j.id) } };
      }

      case TargetType.CONTRACT_TYPE: {
        // الحصول على المستخدمين بنوع العقد المحدد
        const usersWithContract = await this.prisma.contract.findMany({
          where: {
            type: rule.targetValue as any,
            status: 'ACTIVE',
          },
          select: { userId: true },
        });
        return { id: { in: usersWithContract.map((c) => c.userId) } };
      }

      case TargetType.SHIFT: {
        // الحصول على المستخدمين في الوردية المحددة
        const shiftAssignments = await this.prisma.shiftSchedule.findMany({
          where: { shiftId: rule.targetValue },
          select: { userId: true },
          distinct: ['userId'],
        });
        return { id: { in: shiftAssignments.map((s) => s.userId) } };
      }

      case TargetType.LOCATION:
        return { branchId: rule.targetValue };

      case TargetType.TAG:
        // الوسوم غير مدعومة حالياً
        return null;

      default:
        return null;
    }
  }

  // ==================== الدوال المساعدة ====================

  /**
   * الحصول على بيانات المستخدم للتحقق من الاستهداف
   */
  private async getUserTargetingData(
    userId: string,
    companyId: string,
  ): Promise<UserTargetingData | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId, status: 'ACTIVE' },
      select: {
        id: true,
        role: true,
        branchId: true,
        departmentId: true,
        jobTitleId: true,
        managerId: true,
        isSaudi: true,
      },
    });

    return user;
  }

  /**
   * التحقق إذا كان المستخدم في فريق (تحت مدير معين)
   */
  private async isUserInTeam(userId: string, managerId: string): Promise<boolean> {
    // التحقق من التبعية المباشرة
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { managerId: true },
    });

    if (user?.managerId === managerId) {
      return true;
    }

    // التحقق من التبعية غير المباشرة (موظفي الموظفين)
    const subordinates = await this.getAllSubordinateIds(managerId);
    return subordinates.includes(userId);
  }

  /**
   * التحقق من الدرجة الوظيفية
   */
  private async isUserInGrade(userId: string, gradeValue: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        jobTitleRef: {
          select: { grade: true },
        },
      },
    });

    const targetGrade = parseInt(gradeValue);
    return user?.jobTitleRef?.grade === targetGrade;
  }

  /**
   * التحقق من نوع العقد
   */
  private async isUserContractType(
    userId: string,
    contractType: string,
  ): Promise<boolean> {
    const contract = await this.prisma.contract.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        type: contractType as any,
      },
    });

    return !!contract;
  }

  /**
   * التحقق من الوردية
   */
  private async isUserInShift(userId: string, shiftId: string): Promise<boolean> {
    const assignment = await this.prisma.shiftSchedule.findFirst({
      where: {
        userId,
        shiftId,
      },
    });

    return !!assignment;
  }

  /**
   * الحصول على معرفات المرؤوسين المباشرين
   */
  private async getSubordinateIds(managerId: string): Promise<string[]> {
    const subordinates = await this.prisma.user.findMany({
      where: { managerId },
      select: { id: true },
    });

    return subordinates.map((s) => s.id);
  }

  /**
   * الحصول على معرفات الزملاء (تحت نفس المدير)
   */
  private async getColleagueIds(
    managerId: string,
    excludeUserId: string,
  ): Promise<string[]> {
    const colleagues = await this.prisma.user.findMany({
      where: {
        managerId,
        id: { not: excludeUserId },
      },
      select: { id: true },
    });

    return colleagues.map((c) => c.id);
  }

  /**
   * الحصول على كل المرؤوسين (المباشرين وغير المباشرين)
   */
  private async getAllSubordinateIds(managerId: string): Promise<string[]> {
    const allSubordinates: string[] = [];
    const queue = [managerId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const directReports = await this.prisma.user.findMany({
        where: { managerId: currentId },
        select: { id: true },
      });

      for (const report of directReports) {
        allSubordinates.push(report.id);
        queue.push(report.id);
      }
    }

    return allSubordinates;
  }

  /**
   * حساب توزيع الجمهور المستهدف
   */
  private async calculateAudienceBreakdown(
    whereCondition: Prisma.UserWhereInput,
  ): Promise<AudiencePreview['breakdown']> {
    // التوزيع حسب القسم
    const byDepartmentRaw = await this.prisma.user.groupBy({
      by: ['departmentId'],
      where: whereCondition,
      _count: { id: true },
    });

    const departmentIds = byDepartmentRaw
      .filter((d) => d.departmentId)
      .map((d) => d.departmentId as string);

    const departments = await this.prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true },
    });

    const departmentMap = new Map(departments.map((d) => [d.id, d.name]));

    const byDepartment = byDepartmentRaw
      .filter((d) => d.departmentId)
      .map((d) => ({
        id: d.departmentId as string,
        name: departmentMap.get(d.departmentId as string) || 'غير محدد',
        count: d._count.id,
      }))
      .sort((a, b) => b.count - a.count);

    // التوزيع حسب الفرع
    const byBranchRaw = await this.prisma.user.groupBy({
      by: ['branchId'],
      where: whereCondition,
      _count: { id: true },
    });

    const branchIds = byBranchRaw
      .filter((b) => b.branchId)
      .map((b) => b.branchId as string);

    const branches = await this.prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true },
    });

    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    const byBranch = byBranchRaw
      .filter((b) => b.branchId)
      .map((b) => ({
        id: b.branchId as string,
        name: branchMap.get(b.branchId as string) || 'غير محدد',
        count: b._count.id,
      }))
      .sort((a, b) => b.count - a.count);

    // التوزيع حسب الدور
    const byRoleRaw = await this.prisma.user.groupBy({
      by: ['role'],
      where: whereCondition,
      _count: { id: true },
    });

    const byRole = byRoleRaw.map((r) => ({
      role: r.role,
      count: r._count.id,
    }));

    return { byDepartment, byBranch, byRole };
  }

  // ==================== بناء استعلام الفيد للمستخدم ====================

  /**
   * بناء شرط الاستعلام للحصول على المنشورات المستهدفة لمستخدم معين
   * يستخدم في الـ feed لجلب المنشورات التي يمكن للمستخدم رؤيتها
   */
  async buildFeedWhereClause(
    userId: string,
    companyId: string,
  ): Promise<Prisma.PostWhereInput> {
    // جلب بيانات المستخدم
    const user = await this.getUserTargetingData(userId, companyId);
    if (!user) {
      return { id: 'none' }; // لا يوجد مستخدم
    }

    // الحصول على معرفات المدراء (للفريق)
    const managerChain = await this.getManagerChain(userId);

    // بناء الشروط
    const conditions: Prisma.PostWhereInput[] = [];

    // 1. المنشورات العامة
    conditions.push({ visibilityType: VisibilityType.PUBLIC });

    // 2. المنشورات للقسم (إذا كان المستخدم في قسم)
    if (user.departmentId) {
      conditions.push({
        visibilityType: VisibilityType.DEPARTMENT,
        author: { departmentId: user.departmentId },
      });
    }

    // 3. المنشورات للفريق (مرؤوسين أو زملاء)
    if (managerChain.length > 0 || user.managerId) {
      conditions.push({
        visibilityType: VisibilityType.TEAM,
        authorId: { in: [...managerChain, user.managerId].filter(Boolean) as string[] },
      });
    }

    // 4. منشورات المدراء فقط
    if (user.role === Role.MANAGER || user.role === Role.ADMIN) {
      conditions.push({ visibilityType: VisibilityType.MANAGERS_ONLY });
    }

    // 5. منشورات الموارد البشرية فقط
    if (user.role === Role.HR || user.role === Role.ADMIN) {
      conditions.push({ visibilityType: VisibilityType.HR_ONLY });
    }

    // 6. المنشورات المستهدفة - تحتاج فحص إضافي
    // سيتم تصفيتها بعد الجلب باستخدام isUserTargeted
    conditions.push({
      visibilityType: VisibilityType.TARGETED,
    });

    // 7. المنشورات التي كتبها المستخدم نفسه (بما فيها الخاصة)
    conditions.push({ authorId: userId });

    return {
      companyId,
      status: 'PUBLISHED',
      OR: conditions,
      // استثناء المنشورات المنتهية
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ],
    };
  }

  /**
   * الحصول على سلسلة المدراء (من المستخدم إلى القمة)
   */
  private async getManagerChain(userId: string): Promise<string[]> {
    const chain: string[] = [];
    let currentId = userId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const user = await this.prisma.user.findUnique({
        where: { id: currentId },
        select: { managerId: true },
      });

      if (user?.managerId) {
        chain.push(user.managerId);
        currentId = user.managerId;
      } else {
        break;
      }
    }

    return chain;
  }

  /**
   * تصفية المنشورات المستهدفة بعد الجلب
   * يستخدم للتأكد من أن المستخدم مستهدف فعلاً بالمنشور
   */
  async filterTargetedPosts(
    userId: string,
    companyId: string,
    posts: Array<{ id: string; visibilityType: VisibilityType; targets: any[] }>,
  ): Promise<string[]> {
    const visiblePostIds: string[] = [];

    for (const post of posts) {
      // إذا لم يكن المنشور مستهدفاً، مرره
      if (post.visibilityType !== VisibilityType.TARGETED) {
        visiblePostIds.push(post.id);
        continue;
      }

      // تحقق من الاستهداف
      const result = await this.isUserTargeted(userId, companyId, post.id);
      if (result.isTargeted) {
        visiblePostIds.push(post.id);
      }
    }

    return visiblePostIds;
  }
}
