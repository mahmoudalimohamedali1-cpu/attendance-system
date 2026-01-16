import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 🧠 System Context Builder Service
 * Builds comprehensive, real-time context from ALL system data
 * to feed to AI Chat for intelligent responses.
 * 
 * Features:
 * - Company overview and stats
 * - All employees with details
 * - Today's attendance summary
 * - Leave requests and balances
 * - Payroll status
 * - Departments and shifts
 * - Today's important events
 */

interface SystemContext {
    company: string;
    employees: string;
    attendance: string;
    leaves: string;
    payroll: string;
    departments: string;
    shifts: string;
    events: string;
    summary: string;
}

interface CacheEntry {
    context: string;
    timestamp: number;
}

@Injectable()
export class SystemContextBuilderService {
    private readonly logger = new Logger(SystemContextBuilderService.name);
    private readonly cache = new Map<string, CacheEntry>();
    private readonly CACHE_TTL = 30000; // 30 seconds

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 🏢 Build ULTIMATE system context for AI - EVERYTHING!
     */
    async buildFullContext(companyId: string): Promise<string> {
        // Check cache first
        const cached = this.cache.get(companyId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.context;
        }

        try {
            const [
                company,
                employees,
                attendance,
                leaves,
                departments,
                shifts,
                events,
                // === NEW DATA SOURCES ===
                payroll,
                tasks,
                advances,
                custody,
                disciplinary,
                salaries,
                documents,
                requests,
            ] = await Promise.all([
                this.getCompanyContext(companyId),
                this.getEmployeesContext(companyId),
                this.getAttendanceContext(companyId),
                this.getLeavesContext(companyId),
                this.getDepartmentsContext(companyId),
                this.getShiftsContext(companyId),
                this.getTodayEvents(companyId),
                // === NEW ===
                this.getPayrollContext(companyId),
                this.getTasksContext(companyId),
                this.getAdvancesContext(companyId),
                this.getCustodyContext(companyId),
                this.getDisciplinaryContext(companyId),
                this.getSalariesContext(companyId),
                this.getExpiringDocuments(companyId),
                this.getPendingRequests(companyId),
            ]);

            const context = `
=== 📊 بيانات النظام الحية الكاملة (${new Date().toLocaleString('ar-SA')}) ===

${company}

${employees}

${attendance}

${leaves}

${departments}

${shifts}

${payroll}

${salaries}

${tasks}

${advances}

${custody}

${disciplinary}

${documents}

${requests}

${events}

=== نهاية البيانات - الـ AI يعرف كل شيء عن النظام ===
`.trim();

            // Cache the result
            this.cache.set(companyId, { context, timestamp: Date.now() });

            return context;
        } catch (error) {
            this.logger.error('Failed to build system context', error);
            return '⚠️ لم يتم تحميل بيانات النظام';
        }
    }

    /**
     * 🏢 Company overview
     */
    private async getCompanyContext(companyId: string): Promise<string> {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            include: {
                _count: {
                    select: {
                        users: true,
                        branches: true,
                        departments: true,
                    }
                }
            }
        });

        if (!company) return '🏢 الشركة: غير موجودة';

        return `🏢 **الشركة:** ${company.name}
• عدد الموظفين: ${company._count.users}
• عدد الفروع: ${company._count.branches}
• عدد الأقسام: ${company._count.departments}`;
    }

    /**
     * 👥 All employees with details
     */
    private async getEmployeesContext(companyId: string): Promise<string> {
        const employees = await this.prisma.user.findMany({
            where: { companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                status: true,
                employeeCode: true,
                department: { select: { name: true } },
                branch: { select: { name: true } },
                hireDate: true,
                salary: true,
            },
            orderBy: { firstName: 'asc' },
            take: 100, // Limit to prevent huge context
        });

        if (employees.length === 0) return '👥 **الموظفين:** لا يوجد موظفين';

        const employeeList = employees.map((e, i) => {
            const name = `${e.firstName} ${e.lastName}`;
            const dept = e.department?.name || 'بدون قسم';
            const role = this.translateRole(e.role);
            const status = e.status === 'ACTIVE' ? '✅' : '⏸️';
            return `${i + 1}. ${status} ${name} | ${role} | ${dept}`;
        }).join('\n');

        return `👥 **الموظفين (${employees.length}):**
${employeeList}`;
    }

    /**
     * 📊 Today's attendance
     */
    private async getAttendanceContext(companyId: string): Promise<string> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [totalEmployees, todayRecords, lateCount] = await Promise.all([
            this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
            this.prisma.attendance.findMany({
                where: {
                    user: { companyId },
                    date: { gte: today, lt: tomorrow }
                },
                include: {
                    user: { select: { firstName: true, lastName: true } }
                }
            }),
            this.prisma.attendance.count({
                where: {
                    user: { companyId },
                    date: { gte: today, lt: tomorrow },
                    status: 'LATE'
                }
            })
        ]);

        const presentCount = todayRecords.length;
        const absentCount = totalEmployees - presentCount;
        const attendanceRate = totalEmployees > 0
            ? Math.round((presentCount / totalEmployees) * 100)
            : 0;

        // Get late employees
        const lateEmployees = todayRecords
            .filter(r => r.status === 'LATE')
            .map(r => `${r.user.firstName} ${r.user.lastName}`)
            .slice(0, 10);

        return `📊 **حضور اليوم (${today.toLocaleDateString('ar-SA')}):**
• إجمالي الموظفين: ${totalEmployees}
• حاضرين: ${presentCount} ✅
• غائبين: ${absentCount} ❌
• متأخرين: ${lateCount} ⏰
• نسبة الحضور: ${attendanceRate}%
${lateEmployees.length > 0 ? `• المتأخرين: ${lateEmployees.join('، ')}` : ''}`;
    }

    /**
     * 🏖️ Leaves overview
     */
    private async getLeavesContext(companyId: string): Promise<string> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [pendingLeaves, approvedToday, onLeaveToday] = await Promise.all([
                this.prisma.leaveRequest.count({
                    where: {
                        user: { companyId },
                        status: 'PENDING'
                    }
                }),
                this.prisma.leaveRequest.count({
                    where: {
                        user: { companyId },
                        status: 'APPROVED',
                        updatedAt: { gte: today }
                    }
                }),
                this.prisma.leaveRequest.count({
                    where: {
                        user: { companyId },
                        status: 'APPROVED',
                        startDate: { lte: new Date() },
                        endDate: { gte: new Date() }
                    }
                })
            ]);

            return `🏖️ **الإجازات:**
• طلبات معلقة: ${pendingLeaves}
• موافق عليها اليوم: ${approvedToday}
• في إجازة الآن: ${onLeaveToday}`;
        } catch {
            return '🏖️ **الإجازات:** لا توجد بيانات';
        }
    }

    /**
     * 🏢 Departments
     */
    private async getDepartmentsContext(companyId: string): Promise<string> {
        const departments = await this.prisma.department.findMany({
            where: { companyId },
            include: {
                _count: { select: { users: true } }
            }
        });

        if (departments.length === 0) return '🏢 **الأقسام:** لا توجد أقسام';

        const deptList = departments.map(d => {
            return `• ${d.name}: ${d._count.users} موظف`;
        }).join('\n');

        return `🏢 **الأقسام (${departments.length}):**
${deptList}`;
    }

    /**
     * 📅 Shifts
     */
    private async getShiftsContext(companyId: string): Promise<string> {
        // Shift model not available in current schema
        return '📅 **الورديات:** غير متوفر';
    }

    /**
     * 🎂 Today's events (birthdays, anniversaries)
     */
    private async getTodayEvents(companyId: string): Promise<string> {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        // Get birthdays this month
        const birthdays = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                dateOfBirth: { not: null }
            },
            select: {
                firstName: true,
                lastName: true,
                dateOfBirth: true
            }
        });

        const todayBirthdays = birthdays.filter(u => {
            if (!u.dateOfBirth) return false;
            const bd = new Date(u.dateOfBirth);
            return bd.getMonth() + 1 === month && bd.getDate() === day;
        });

        // Get work anniversaries
        const anniversaries = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                hireDate: { not: null }
            },
            select: {
                firstName: true,
                lastName: true,
                hireDate: true
            }
        });

        const todayAnniversaries = anniversaries.filter(u => {
            if (!u.hireDate) return false;
            const hd = new Date(u.hireDate);
            return hd.getMonth() + 1 === month && hd.getDate() === day && hd.getFullYear() !== today.getFullYear();
        });

        const events: string[] = [];

        if (todayBirthdays.length > 0) {
            const names = todayBirthdays.map(u => `${u.firstName} ${u.lastName}`).join('، ');
            events.push(`🎂 أعياد ميلاد اليوم: ${names}`);
        }

        if (todayAnniversaries.length > 0) {
            const names = todayAnniversaries.map(u => {
                const years = today.getFullYear() - new Date(u.hireDate!).getFullYear();
                return `${u.firstName} ${u.lastName} (${years} سنة)`;
            }).join('، ');
            events.push(`🎉 ذكرى التعيين: ${names}`);
        }

        if (events.length === 0) {
            return '📅 **أحداث اليوم:** لا توجد مناسبات خاصة';
        }

        return `📅 **أحداث اليوم:**
${events.join('\n')}`;
    }

    /**
     * 🌐 Translate role to Arabic
     */
    private translateRole(role: string): string {
        const roles: Record<string, string> = {
            'ADMIN': 'مدير النظام',
            'HR': 'موارد بشرية',
            'MANAGER': 'مدير',
            'EMPLOYEE': 'موظف',
            'SUPER_ADMIN': 'المدير العام',
        };
        return roles[role] || role;
    }

    /**
     * 🔍 Quick search in context
     */
    async searchEmployee(companyId: string, query: string): Promise<string> {
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { employeeCode: { contains: query, mode: 'insensitive' } },
                ]
            },
            include: {
                department: { select: { name: true } },
                branch: { select: { name: true } },
            },
            take: 10
        });

        if (employees.length === 0) {
            return `❌ لم يتم العثور على موظف باسم "${query}"`;
        }

        return employees.map(e => {
            return `👤 **${e.firstName} ${e.lastName}**
• الوظيفة: ${this.translateRole(e.role)}
• القسم: ${e.department?.name || 'بدون'}
• الفرع: ${e.branch?.name || 'بدون'}
• البريد: ${e.email}
• الحالة: ${e.status === 'ACTIVE' ? '✅ نشط' : '⏸️ غير نشط'}`;
        }).join('\n\n');
    }

    /**
     * 📊 Get quick stats
     */
    async getQuickStats(companyId: string): Promise<string> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [
            totalEmployees,
            activeEmployees,
            presentToday,
            pendingLeaves,
            departments
        ] = await Promise.all([
            this.prisma.user.count({ where: { companyId } }),
            this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
            this.prisma.attendance.count({
                where: {
                    user: { companyId },
                    date: { gte: today, lt: tomorrow }
                }
            }),
            this.prisma.leaveRequest.count({
                where: { user: { companyId }, status: 'PENDING' }
            }),
            this.prisma.department.count({ where: { companyId } })
        ]);

        return `📊 **ملخص سريع:**
• إجمالي الموظفين: ${totalEmployees}
• النشطين: ${activeEmployees}
• حضور اليوم: ${presentToday}
• إجازات معلقة: ${pendingLeaves}
• الأقسام: ${departments}`;
    }

    // ========== NEW COMPREHENSIVE DATA SOURCES ==========

    /**
     * 💰 Payroll context
     */
    private async getPayrollContext(companyId: string): Promise<string> {
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const [payrollRuns, pendingPayslips, totalPayroll] = await Promise.all([
                this.prisma.payrollRun.count({
                    where: { companyId }
                }),
                this.prisma.payslip.count({
                    where: {
                        employee: { companyId }
                    }
                }),
                this.prisma.payslip.aggregate({
                    where: {
                        employee: { companyId }
                    },
                    _sum: { netSalary: true }
                })
            ]);

            const totalNet = Number(totalPayroll._sum?.netSalary) || 0;

            return `💰 **الرواتب (${currentMonth}/${currentYear}):**
• تشغيلات الرواتب: ${payrollRuns}
• قسائم معلقة: ${pendingPayslips}
• إجمالي صافي الرواتب: ${totalNet.toLocaleString('ar-SA')} ريال`;
        } catch {
            return '💰 **الرواتب:** لا توجد بيانات';
        }
    }

    /**
     * 📋 Tasks context - SAFE (model may not exist)
     */
    private async getTasksContext(companyId: string): Promise<string> {
        try {
            // Check if task model exists before querying
            if (!this.prisma.task) {
                return '📋 **المهام:** غير مفعلة';
            }
            const [totalTasks, pendingTasks, completedTasks, overdueTasks] = await Promise.all([
                this.prisma.task.count({ where: { companyId } }),
                this.prisma.task.count({ where: { companyId, status: 'TODO' } }),
                this.prisma.task.count({ where: { companyId, status: 'COMPLETED' } }),
                this.prisma.task.count({
                    where: {
                        companyId,
                        status: { notIn: ['COMPLETED', 'CANCELLED'] },
                        dueDate: { lt: new Date() }
                    }
                })
            ]);

            return `📋 **المهام:**
• إجمالي المهام: ${totalTasks}
• معلقة: ${pendingTasks}
• مكتملة: ${completedTasks}
• متأخرة: ${overdueTasks} ⚠️`;
        } catch (error) {
            this.logger.warn('Tasks context unavailable', error);
            return '📋 **المهام:** غير مفعلة';
        }
    }

    /**
     * 💵 Advances context
     */
    private async getAdvancesContext(companyId: string): Promise<string> {
        try {
            const [pendingAdvances, approvedAdvances, totalAmount] = await Promise.all([
                this.prisma.advanceRequest.count({
                    where: { user: { companyId }, status: 'PENDING' }
                }),
                this.prisma.advanceRequest.count({
                    where: { user: { companyId }, status: 'APPROVED' }
                }),
                this.prisma.advanceRequest.aggregate({
                    where: { user: { companyId }, status: 'APPROVED' },
                    _sum: { amount: true }
                })
            ]);

            const total = Number(totalAmount._sum?.amount) || 0;

            return `💵 **السُلف:**
• طلبات معلقة: ${pendingAdvances}
• موافق عليها: ${approvedAdvances}
• إجمالي المبلغ: ${total.toLocaleString('ar-SA')} ريال`;
        } catch {
            return '💵 **السُلف:** لا توجد سُلف';
        }
    }

    /**
     * 📦 Custody context
     */
    private async getCustodyContext(companyId: string): Promise<string> {
        try {
            const [totalCustody, activeCustody, pendingApproval] = await Promise.all([
                this.prisma.custodyItem.count({ where: { companyId } }),
                this.prisma.custodyAssignment.count({
                    where: {
                        companyId,
                        status: 'DELIVERED'
                    }
                }),
                this.prisma.custodyAssignment.count({
                    where: {
                        companyId,
                        status: 'PENDING'
                    }
                })
            ]);

            return `📦 **العُهد:**
• إجمالي العُهد: ${totalCustody}
• مُسلّمة حالياً: ${activeCustody}
• بانتظار الموافقة: ${pendingApproval}`;
        } catch {
            return '📦 **العُهد:** لا توجد عُهد';
        }
    }

    /**
     * ⚖️ Disciplinary context - SAFE (model may not exist)
     */
    private async getDisciplinaryContext(companyId: string): Promise<string> {
        try {
            if (!this.prisma.disciplinaryCase) {
                return '⚖️ **الإجراءات التأديبية:** غير مفعلة';
            }
            const [openCases, warnings, deductions] = await Promise.all([
                this.prisma.disciplinaryCase.count({
                    where: { companyId, status: 'SUBMITTED_TO_HR' }
                }),
                this.prisma.disciplinaryCase.count({
                    where: { companyId, decisionType: 'WARNING' }
                }),
                this.prisma.disciplinaryCase.count({
                    where: { companyId, decisionType: 'SALARY_DEDUCTION' }
                })
            ]);

            return `⚖️ **الإجراءات التأديبية:**
• قضايا مفتوحة: ${openCases}
• إنذارات: ${warnings}
• خصومات: ${deductions}`;
        } catch (error) {
            this.logger.warn('Disciplinary context unavailable', error);
            return '⚖️ **الإجراءات التأديبية:** غير مفعلة';
        }
    }

    /**
     * 💳 Salaries summary
     */
    private async getSalariesContext(companyId: string): Promise<string> {
        try {
            const salaryStats = await this.prisma.user.aggregate({
                where: { companyId, status: 'ACTIVE' },
                _sum: { salary: true },
                _avg: { salary: true },
                _min: { salary: true },
                _max: { salary: true },
            });

            const total = Number(salaryStats._sum?.salary) || 0;
            const avg = Math.round(Number(salaryStats._avg?.salary) || 0);
            const min = Number(salaryStats._min?.salary) || 0;
            const max = Number(salaryStats._max?.salary) || 0;

            return `💳 **ملخص الرواتب الأساسية:**
• الإجمالي: ${total.toLocaleString('ar-SA')} ريال
• المتوسط: ${avg.toLocaleString('ar-SA')} ريال
• الأقل: ${min.toLocaleString('ar-SA')} ريال
• الأعلى: ${max.toLocaleString('ar-SA')} ريال`;
        } catch {
            return '💳 **الرواتب:** لا توجد بيانات';
        }
    }

    /**
     * 📄 Expiring documents
     */
    private async getExpiringDocuments(companyId: string): Promise<string> {
        try {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            // Check for expiring iqamas, passports, etc.
            const expiringUsers = await this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    OR: [
                        { iqamaExpiryDate: { lte: thirtyDaysFromNow, gte: new Date() } },
                        { passportExpiryDate: { lte: thirtyDaysFromNow, gte: new Date() } },
                    ]
                },
                select: {
                    firstName: true,
                    lastName: true,
                    iqamaExpiryDate: true,
                    passportExpiryDate: true,
                }
            });

            if (expiringUsers.length === 0) {
                return '📄 **المستندات المنتهية:** لا توجد مستندات تنتهي قريباً ✅';
            }

            const docs = expiringUsers.slice(0, 5).map(u => {
                const name = `${u.firstName} ${u.lastName}`;
                if (u.iqamaExpiryDate && u.iqamaExpiryDate <= thirtyDaysFromNow) {
                    return `• ${name}: إقامة تنتهي ${new Date(u.iqamaExpiryDate).toLocaleDateString('ar-SA')}`;
                }
                if (u.passportExpiryDate && u.passportExpiryDate <= thirtyDaysFromNow) {
                    return `• ${name}: جواز ينتهي ${new Date(u.passportExpiryDate).toLocaleDateString('ar-SA')}`;
                }
                return '';
            }).filter(Boolean).join('\n');

            return `📄 **مستندات تنتهي خلال 30 يوم (${expiringUsers.length}):**
${docs}`;
        } catch {
            return '📄 **المستندات:** لا توجد بيانات';
        }
    }

    /**
     * 📝 Pending requests summary
     */
    private async getPendingRequests(companyId: string): Promise<string> {
        try {
            const [
                pendingLeaves,
                pendingAdvances,
                pendingRaises,
                pendingLetters
            ] = await Promise.all([
                this.prisma.leaveRequest.count({
                    where: { user: { companyId }, status: 'PENDING' }
                }),
                this.prisma.advanceRequest.count({
                    where: { user: { companyId }, status: 'PENDING' }
                }),
                this.prisma.raiseRequest.count({
                    where: { companyId, status: 'PENDING' }
                }),
                this.prisma.letterRequest.count({
                    where: { user: { companyId }, status: 'PENDING' }
                })
            ]);

            const total = pendingLeaves + pendingAdvances + pendingRaises + pendingLetters;

            return `📝 **الطلبات المعلقة (${total}):**
• إجازات: ${pendingLeaves}
• سُلف: ${pendingAdvances}
• علاوات: ${pendingRaises}
• خطابات: ${pendingLetters}`;
        } catch {
            return '📝 **الطلبات:** لا توجد طلبات معلقة';
        }
    }
}
