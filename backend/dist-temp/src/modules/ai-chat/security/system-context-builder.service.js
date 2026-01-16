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
var SystemContextBuilderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemContextBuilderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../common/prisma/prisma.service");
let SystemContextBuilderService = SystemContextBuilderService_1 = class SystemContextBuilderService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SystemContextBuilderService_1.name);
        this.cache = new Map();
        this.CACHE_TTL = 30000;
    }
    async buildFullContext(companyId) {
        const cached = this.cache.get(companyId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.context;
        }
        try {
            const [company, employees, attendance, leaves, departments, shifts, events, payroll, tasks, advances, custody, disciplinary, salaries, documents, requests,] = await Promise.all([
                this.getCompanyContext(companyId),
                this.getEmployeesContext(companyId),
                this.getAttendanceContext(companyId),
                this.getLeavesContext(companyId),
                this.getDepartmentsContext(companyId),
                this.getShiftsContext(companyId),
                this.getTodayEvents(companyId),
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
            this.cache.set(companyId, { context, timestamp: Date.now() });
            return context;
        }
        catch (error) {
            this.logger.error('Failed to build system context', error);
            return '⚠️ لم يتم تحميل بيانات النظام';
        }
    }
    async getCompanyContext(companyId) {
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
        if (!company)
            return '🏢 الشركة: غير موجودة';
        return `🏢 **الشركة:** ${company.name}
• عدد الموظفين: ${company._count.users}
• عدد الفروع: ${company._count.branches}
• عدد الأقسام: ${company._count.departments}`;
    }
    async getEmployeesContext(companyId) {
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
            take: 100,
        });
        if (employees.length === 0)
            return '👥 **الموظفين:** لا يوجد موظفين';
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
    async getAttendanceContext(companyId) {
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
    async getLeavesContext(companyId) {
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
        }
        catch {
            return '🏖️ **الإجازات:** لا توجد بيانات';
        }
    }
    async getDepartmentsContext(companyId) {
        const departments = await this.prisma.department.findMany({
            where: { companyId },
            include: {
                _count: { select: { users: true } }
            }
        });
        if (departments.length === 0)
            return '🏢 **الأقسام:** لا توجد أقسام';
        const deptList = departments.map(d => {
            return `• ${d.name}: ${d._count.users} موظف`;
        }).join('\n');
        return `🏢 **الأقسام (${departments.length}):**
${deptList}`;
    }
    async getShiftsContext(companyId) {
        return '📅 **الورديات:** غير متوفر';
    }
    async getTodayEvents(companyId) {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();
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
            if (!u.dateOfBirth)
                return false;
            const bd = new Date(u.dateOfBirth);
            return bd.getMonth() + 1 === month && bd.getDate() === day;
        });
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
            if (!u.hireDate)
                return false;
            const hd = new Date(u.hireDate);
            return hd.getMonth() + 1 === month && hd.getDate() === day && hd.getFullYear() !== today.getFullYear();
        });
        const events = [];
        if (todayBirthdays.length > 0) {
            const names = todayBirthdays.map(u => `${u.firstName} ${u.lastName}`).join('، ');
            events.push(`🎂 أعياد ميلاد اليوم: ${names}`);
        }
        if (todayAnniversaries.length > 0) {
            const names = todayAnniversaries.map(u => {
                const years = today.getFullYear() - new Date(u.hireDate).getFullYear();
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
    translateRole(role) {
        const roles = {
            'ADMIN': 'مدير النظام',
            'HR': 'موارد بشرية',
            'MANAGER': 'مدير',
            'EMPLOYEE': 'موظف',
            'SUPER_ADMIN': 'المدير العام',
        };
        return roles[role] || role;
    }
    async searchEmployee(companyId, query) {
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
    async getQuickStats(companyId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [totalEmployees, activeEmployees, presentToday, pendingLeaves, departments] = await Promise.all([
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
    async getPayrollContext(companyId) {
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
        }
        catch {
            return '💰 **الرواتب:** لا توجد بيانات';
        }
    }
    async getTasksContext(companyId) {
        try {
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
        }
        catch (error) {
            this.logger.warn('Tasks context unavailable', error);
            return '📋 **المهام:** غير مفعلة';
        }
    }
    async getAdvancesContext(companyId) {
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
        }
        catch {
            return '💵 **السُلف:** لا توجد سُلف';
        }
    }
    async getCustodyContext(companyId) {
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
        }
        catch {
            return '📦 **العُهد:** لا توجد عُهد';
        }
    }
    async getDisciplinaryContext(companyId) {
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
        }
        catch (error) {
            this.logger.warn('Disciplinary context unavailable', error);
            return '⚖️ **الإجراءات التأديبية:** غير مفعلة';
        }
    }
    async getSalariesContext(companyId) {
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
        }
        catch {
            return '💳 **الرواتب:** لا توجد بيانات';
        }
    }
    async getExpiringDocuments(companyId) {
        try {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
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
        }
        catch {
            return '📄 **المستندات:** لا توجد بيانات';
        }
    }
    async getPendingRequests(companyId) {
        try {
            const [pendingLeaves, pendingAdvances, pendingRaises, pendingLetters] = await Promise.all([
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
        }
        catch {
            return '📝 **الطلبات:** لا توجد طلبات معلقة';
        }
    }
};
exports.SystemContextBuilderService = SystemContextBuilderService;
exports.SystemContextBuilderService = SystemContextBuilderService = SystemContextBuilderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SystemContextBuilderService);
//# sourceMappingURL=system-context-builder.service.js.map