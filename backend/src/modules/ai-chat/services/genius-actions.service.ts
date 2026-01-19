import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { GeniusIntentService, ParsedIntent } from './genius-intent.service';

/**
 * 🎯 GENIUS Actions Service
 * Executes real actions using AI-powered intent understanding
 */

export interface ActionResult {
    success: boolean;
    message: string;
    data?: any;
    errors?: string[];
    suggestions?: string[];
}

interface ActionContext {
    userId: string;
    companyId: string;
    userRole: string;
}

@Injectable()
export class GeniusActionsService {
    private readonly logger = new Logger(GeniusActionsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly intentService: GeniusIntentService
    ) { }

    async executeAction(message: string, context: ActionContext): Promise<ActionResult> {
        // 🧠 Use AI to understand the intent
        const intent = await this.intentService.parseIntent(message);
        this.logger.log(`[GENIUS-ACTION] AI Intent: ${intent.action} ${intent.entity} (confidence: ${intent.confidence})`);
        this.logger.log(`[GENIUS-ACTION] Params: ${JSON.stringify(intent.params)}`);

        const actionKey = `${intent.action}_${intent.entity}`;

        if (!this.hasPermission(actionKey, context.userRole)) {
            return {
                success: false,
                message: '❌ ليس لديك صلاحية لتنفيذ هذا الإجراء',
                suggestions: ['اطلب الصلاحية من المسؤول']
            };
        }

        try {
            // Route based on AI-detected intent
            switch (actionKey) {
                case 'create_task': return this.createTaskAI(intent, context);
                case 'update_task': return this.updateTaskAI(intent, context);
                case 'assign_task': return this.assignTaskAI(intent, context);
                case 'create_custody': return this.createCustodyAI(intent, context);
                case 'assign_custody': return this.assignCustodyAI(intent, context);
                case 'create_employee': return this.createEmployeeAI(intent, context);
                case 'update_employee': return this.updateEmployeeAI(intent, context);
                case 'transfer_employee': return this.transferEmployeeAI(intent, context);
                case 'create_department': return this.createDepartmentAI(intent, context);
                case 'transfer_department': return this.transferDepartmentAI(intent, context);
                case 'create_branch': return this.createBranchAI(intent, context);
                case 'approve_leave': return this.approveLeaveAI(intent, context);
                case 'reject_leave': return this.rejectLeaveAI(intent, context);
                case 'create_bonus':
                case 'assign_bonus': return this.addBonusAI(intent, context);
                case 'create_deduction':
                case 'assign_deduction': return this.addDeductionAI(intent, context);
                case 'create_notification':
                case 'assign_notification': return this.sendNotificationAI(intent, context);
                default:
                    // Try legacy method
                    return this.executeLegacy(message, context);
            }
        } catch (error: any) {
            this.logger.error(`Action error: ${error.message}`);
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }

    /**
     * Legacy execution for backward compatibility
     */
    private async executeLegacy(message: string, context: ActionContext): Promise<ActionResult> {
        const actionType = this.detectActionType(message);

        switch (actionType) {
            case 'create_task': return this.createTask(message, context);
            case 'complete_task': return this.completeTask(message, context);
            case 'create_custody': return this.createCustodyItem(message, context);
            case 'assign_custody': return this.assignCustody(message, context);
            case 'create_employee': return this.createEmployee(message, context);
            case 'update_salary': return this.updateSalary(message, context);
            case 'transfer_employee': return this.transferEmployee(message, context);
            case 'approve_leave': return this.approveLeave(message, context);
            case 'reject_leave': return this.rejectLeave(message, context);
            case 'add_bonus': return this.addBonus(message, context);
            case 'add_deduction': return this.addDeduction(message, context);
            case 'create_department': return this.createDepartment(message, context);
            case 'create_branch': return this.createBranch(message, context);
            case 'send_notification': return this.sendNotification(message, context);
            default:
                return {
                    success: false,
                    message: '🤔 لم أفهم الإجراء المطلوب. جرب صياغة مختلفة.',
                    suggestions: this.getActionSuggestions()
                };
        }
    }

    private detectActionType(message: string): string {
        const m = message.toLowerCase();

        if (/^(أضف|انشئ|اضف)\s*(مهمة|مهمه)/.test(m)) return 'create_task';
        if (/^(أنهي|انهي|أكمل|اكمل)\s*(مهمة|مهمه)/.test(m)) return 'complete_task';
        if (/^(أضف|انشئ|سجل)\s*(عهدة|عهده)/.test(m)) return 'create_custody';
        if (/^(سلم|اعطي)\s*(عهدة|عهده)/.test(m) || /عهدة.*ل[ـ]?\s/.test(m)) return 'assign_custody';
        if (/^(أضف|انشئ|سجل)\s*(موظف)/.test(m)) return 'create_employee';
        if (/^(عدل|غير)\s*(راتب|معاش)/.test(m) || /راتب.*(الي|إلى)/.test(m)) return 'update_salary';
        if (/^(انقل|نقل)\s*(موظف)/.test(m) || /موظف.*الي.*قسم/.test(m)) return 'transfer_employee';
        if (/^(وافق|اقبل)\s*(على)?\s*(إجازة|اجازة)/.test(m)) return 'approve_leave';
        if (/^(ارفض)\s*(إجازة|اجازة)/.test(m)) return 'reject_leave';
        if (/^(أضف|اعطي)\s*(مكافأة|مكافاة|بونص)/.test(m) || /مكافأة.*ل[ـ]?\s/.test(m)) return 'add_bonus';
        if (/^(اخصم|خصم)/.test(m) || /خصم.*من/.test(m)) return 'add_deduction';
        if (/^(أضف|انشئ)\s*(قسم|إدارة)/.test(m)) return 'create_department';
        if (/^(أضف|انشئ)\s*(فرع)/.test(m)) return 'create_branch';
        if (/^(ارسل|أرسل)\s*(إشعار|اشعار|رسالة)/.test(m)) return 'send_notification';

        return 'unknown';
    }

    private hasPermission(actionKey: string, userRole: string): boolean {
        const adminOnly = ['create_employee', 'update_salary', 'create_department', 'create_branch'];
        const hrActions = ['approve_leave', 'reject_leave', 'create_bonus', 'assign_bonus', 'create_deduction', 'assign_deduction'];

        if (adminOnly.some(a => actionKey.includes(a))) {
            return ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
        }
        if (hrActions.some(a => actionKey.includes(a))) {
            return ['ADMIN', 'SUPER_ADMIN', 'HR'].includes(userRole);
        }
        return ['ADMIN', 'SUPER_ADMIN', 'HR', 'MANAGER'].includes(userRole);
    }

    // ========== AI-POWERED ACTIONS ==========

    private async createDepartmentAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { name, branchName } = intent.params;

        if (!name) {
            return { success: false, message: '❌ يرجى تحديد اسم القسم', suggestions: ['أضف قسم HR في فرع الرياض'] };
        }

        try {
            // Check if department already exists
            const existingDept = await this.prisma.department.findFirst({
                where: {
                    companyId: context.companyId,
                    name: { equals: name, mode: 'insensitive' }
                },
                include: { branch: { select: { name: true } } }
            });

            if (existingDept) {
                const existingBranchName = (existingDept as any).branch?.name || 'غير محدد';

                // If user wants it in a different branch, offer smart options
                if (branchName && !existingBranchName.toLowerCase().includes(branchName.toLowerCase())) {
                    return {
                        success: false,
                        message: `⚠️ القسم "${name}" موجود بالفعل في فرع "${existingBranchName}"

🤔 **اقتراحات ذكية:**
• القسم لا يمكن تكراره بنفس الاسم في الشركة
• يمكنك إنشاء قسم باسم مختلف مثل "${name} - ${branchName}"
• أو نقل القسم الحالي إلى فرع ${branchName}`,
                        suggestions: [
                            `أضف قسم "${name} - ${branchName}"`,
                            `انقل قسم ${name} إلى فرع ${branchName}`,
                            'اعرض الأقسام'
                        ]
                    };
                }

                return {
                    success: false,
                    message: `⚠️ القسم "${name}" موجود بالفعل في فرع "${existingBranchName}"`,
                    suggestions: ['اعرض الأقسام', `أضف قسم "${name} 2"`, `انقل قسم ${name} إلى فرع آخر`]
                };
            }

            // Find branch by name if specified
            let branch;
            if (branchName) {
                branch = await this.prisma.branch.findFirst({
                    where: {
                        companyId: context.companyId,
                        name: { contains: branchName, mode: 'insensitive' }
                    }
                });

                if (!branch) {
                    const branches = await this.prisma.branch.findMany({
                        where: { companyId: context.companyId },
                        select: { name: true }
                    });
                    const branchNames = branches.map(b => b.name).join('، ');
                    return {
                        success: false,
                        message: `❌ لم يتم العثور على فرع "${branchName}"\n\n📍 الفروع المتاحة: ${branchNames || 'لا توجد فروع'}`,
                        suggestions: branches.length > 0 ? [`أضف قسم ${name} في فرع ${branches[0].name}`] : ['أضف فرع "الفرع الرئيسي"']
                    };
                }
            } else {
                branch = await this.prisma.branch.findFirst({
                    where: { companyId: context.companyId }
                });

                if (!branch) {
                    return {
                        success: false,
                        message: '❌ لا يوجد فرع في النظام. يرجى إنشاء فرع أولاً.',
                        suggestions: ['أضف فرع "الفرع الرئيسي"']
                    };
                }
            }

            const dept = await (this.prisma.department.create as any)({
                data: {
                    name,
                    companyId: context.companyId,
                    branchId: branch.id
                }
            });

            return {
                success: true,
                message: `✅ تم إنشاء القسم بنجاح!\n\n🏢 **${dept.name}**\n📍 في فرع: ${branch.name}`,
                data: dept,
                suggestions: ['أضف موظف في هذا القسم', 'اعرض الأقسام']
            };
        } catch (e: any) {
            if (e.message?.includes('Unique constraint')) {
                return {
                    success: false,
                    message: `⚠️ القسم "${name}" موجود بالفعل`,
                    suggestions: ['اعرض الأقسام', `أضف قسم "${name} 2"`]
                };
            }
            return { success: false, message: `❌ فشل إنشاء القسم: ${e.message}` };
        }
    }

    private async transferDepartmentAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { name, branchName } = intent.params;

        if (!name || !branchName) {
            return {
                success: false,
                message: '❌ يرجى تحديد اسم القسم والفرع الجديد',
                suggestions: ['انقل قسم HR إلى فرع الرياض']
            };
        }

        try {
            // Find the department
            const dept = await this.prisma.department.findFirst({
                where: {
                    companyId: context.companyId,
                    name: { contains: name, mode: 'insensitive' }
                },
                include: { branch: { select: { name: true } } }
            });

            if (!dept) {
                return { success: false, message: `❌ القسم "${name}" غير موجود` };
            }

            // Find the target branch
            const targetBranch = await this.prisma.branch.findFirst({
                where: {
                    companyId: context.companyId,
                    name: { contains: branchName, mode: 'insensitive' }
                }
            });

            if (!targetBranch) {
                const branches = await this.prisma.branch.findMany({
                    where: { companyId: context.companyId },
                    select: { name: true }
                });
                return {
                    success: false,
                    message: `❌ الفرع "${branchName}" غير موجود\n\n📍 الفروع المتاحة: ${branches.map(b => b.name).join('، ')}`
                };
            }

            const oldBranchName = (dept as any).branch?.name || 'غير محدد';

            // Update department branch
            await this.prisma.department.update({
                where: { id: dept.id },
                data: { branchId: targetBranch.id }
            });

            return {
                success: true,
                message: `✅ تم نقل القسم بنجاح!\n\n🏢 **${dept.name}**\n📍 من: ${oldBranchName}\n📍 إلى: ${targetBranch.name}`,
                suggestions: ['اعرض الأقسام', 'أضف موظف في هذا القسم']
            };
        } catch (e: any) {
            return { success: false, message: `❌ فشل نقل القسم: ${e.message}` };
        }
    }

    private async createBranchAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { name, location } = intent.params;

        if (!name) {
            return { success: false, message: '❌ يرجى تحديد اسم الفرع', suggestions: ['أضف فرع "الفرع الرئيسي"'] };
        }

        try {
            const branch = await (this.prisma.branch.create as any)({
                data: {
                    name,
                    companyId: context.companyId,
                    location: location || null
                }
            });

            return {
                success: true,
                message: `✅ تم إنشاء الفرع بنجاح!\n\n🏢 **${branch.name}**${location ? `\n📍 الموقع: ${location}` : ''}`,
                data: branch,
                suggestions: ['أضف قسم في هذا الفرع', 'اعرض الفروع']
            };
        } catch (e: any) {
            return { success: false, message: `❌ فشل إنشاء الفرع: ${e.message}` };
        }
    }

    private async createTaskAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { title, assignee, priority, dueDate, description } = intent.params;

        if (!title) {
            return { success: false, message: '❌ يرجى تحديد عنوان المهمة' };
        }

        let assigneeId: string | null = null;
        let assigneeName = '';
        if (assignee) {
            const emp = await this.findEmployeeByName(assignee, context.companyId);
            if (emp) {
                assigneeId = emp.id;
                assigneeName = `${emp.firstName} ${emp.lastName}`;
            }
        }

        const task = await (this.prisma.tasks.create as any)({
            data: {
                title,
                description: description || '',
                priority: priority || 'MEDIUM',
                status: 'PENDING',
                dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                assigneeId,
                createdById: context.userId,
                companyId: context.companyId,
            }
        });

        return {
            success: true,
            message: `✅ تم إنشاء المهمة!\n\n📝 **${task.title}**\n${assigneeName ? `👤 مسندة إلى: ${assigneeName}` : '👤 غير مسندة'}\n⚡ الأولوية: ${this.translatePriority(task.priority)}`,
            data: task
        };
    }

    private async createEmployeeAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { firstName, lastName, department, branch, salary, jobTitle, email } = intent.params;

        if (!firstName) {
            return { success: false, message: '❌ يرجى تحديد اسم الموظف' };
        }

        // Generate email
        const firstNameEn = this.arabicToEnglish(firstName);
        const lastNameEn = this.arabicToEnglish(lastName || 'user');
        const randomNum = Math.floor(Math.random() * 1000);
        const generatedEmail = email || `${firstNameEn}.${lastNameEn}${randomNum}@company.com`;

        // Find department
        let departmentId: string | undefined;
        let deptName = 'غير محدد';
        if (department) {
            const dept = await this.prisma.department.findFirst({
                where: { companyId: context.companyId, name: { contains: department, mode: 'insensitive' } }
            });
            if (dept) {
                departmentId = dept.id;
                deptName = dept.name;
            }
        }

        const employee = await (this.prisma.user.create as any)({
            data: {
                firstName,
                lastName: lastName || '',
                email: generatedEmail,
                password: '$2b$10$defaulthash',
                role: 'EMPLOYEE',
                status: 'ACTIVE',
                companyId: context.companyId,
                departmentId,
                salary: salary ? parseFloat(salary) : null,
                jobTitle: jobTitle || null,
                hireDate: new Date(),
            }
        });

        return {
            success: true,
            message: `✅ تم إضافة الموظف!\n\n👤 **${firstName} ${lastName || ''}**\n📧 ${generatedEmail}\n🏢 القسم: ${deptName}\n💰 الراتب: ${salary ? `${Number(salary).toLocaleString('ar-SA')} ريال` : 'غير محدد'}`,
            data: employee
        };
    }

    private async createCustodyAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { name, serialNumber, assignee, value, category } = intent.params;

        if (!name) {
            return { success: false, message: '❌ يرجى تحديد اسم العهدة' };
        }

        const item = await (this.prisma.custodyItem.create as any)({
            data: {
                name,
                description: '',
                serialNumber: serialNumber || null,
                companyId: context.companyId,
                status: 'AVAILABLE',
                condition: 'NEW',
                purchasePrice: value ? parseFloat(value) : null,
            }
        });

        if (assignee) {
            const emp = await this.findEmployeeByName(assignee, context.companyId);
            if (emp) {
                await (this.prisma.custodyAssignment.create as any)({
                    data: {
                        custodyItemId: item.id,
                        userId: emp.id,
                        assignedById: context.userId,
                        status: 'ASSIGNED',
                        assignedAt: new Date(),
                        companyId: context.companyId,
                    }
                });

                return {
                    success: true,
                    message: `✅ تم إضافة وتسليم العهدة!\n\n📦 **${item.name}**\n🔢 الرقم التسلسلي: ${serialNumber || 'غير محدد'}\n👤 مسلمة إلى: ${emp.firstName} ${emp.lastName}`,
                    data: item
                };
            }
        }

        return {
            success: true,
            message: `✅ تم إضافة العهدة!\n\n📦 **${item.name}**\n🔢 الرقم التسلسلي: ${serialNumber || 'غير محدد'}`,
            data: item
        };
    }

    private async assignCustodyAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { name, assignee } = intent.params;
        return this.assignCustody(`سلم عهدة "${name}" لـ ${assignee}`, context);
    }

    private async updateTaskAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { title, status, priority, assignee } = intent.params;

        if (!title) {
            return { success: false, message: '❌ يرجى تحديد اسم المهمة', suggestions: ['عدل مهمة "اسم المهمة" إلى مكتملة'] };
        }

        try {
            const task = await this.prisma.tasks.findFirst({
                where: { companyId: context.companyId, title: { contains: title, mode: 'insensitive' } },
                include: { assignee: { select: { firstName: true, lastName: true } } }
            });

            if (!task) {
                return { success: false, message: `❌ المهمة "${title}" غير موجودة` };
            }

            const updateData: any = {};
            const changes: string[] = [];

            if (status) {
                const statusMap: any = { 'مكتملة': 'COMPLETED', 'قيد التنفيذ': 'IN_PROGRESS', 'معلقة': 'PENDING', 'ملغاة': 'CANCELLED' };
                updateData.status = statusMap[status] || status.toUpperCase();
                if (updateData.status === 'COMPLETED') updateData.completedAt = new Date();
                changes.push(`الحالة → ${status}`);
            }

            if (priority) {
                const priorityMap: any = { 'عالية': 'HIGH', 'متوسطة': 'MEDIUM', 'منخفضة': 'LOW', 'عاجلة': 'URGENT' };
                updateData.priority = priorityMap[priority] || priority.toUpperCase();
                changes.push(`الأولوية → ${priority}`);
            }

            if (assignee) {
                const emp = await this.findEmployeeByName(assignee, context.companyId);
                if (emp) {
                    updateData.assigneeId = emp.id;
                    changes.push(`المسند إليه → ${emp.firstName} ${emp.lastName}`);
                }
            }

            if (changes.length === 0) {
                return { success: false, message: '❌ لم يتم تحديد أي تغييرات', suggestions: ['عدل مهمة X إلى مكتملة', 'غير أولوية مهمة X إلى عالية'] };
            }

            await (this.prisma.task as any).update({ where: { id: task.id }, data: updateData });

            return {
                success: true,
                message: `✅ تم تحديث المهمة!\n\n📝 **${task.title}**\n\n${changes.map(c => `• ${c}`).join('\n')}`,
                suggestions: ['اعرض المهام', 'أضف مهمة جديدة']
            };
        } catch (e: any) {
            return { success: false, message: `❌ فشل تحديث المهمة: ${e.message}` };
        }
    }

    private async assignTaskAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { title, assignee } = intent.params;
        return this.createTaskAI({ ...intent, params: { ...intent.params, title, assignee } }, context);
    }

    private async updateEmployeeAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { employeeName, salary, department, jobTitle, status, phone, email } = intent.params;

        if (!employeeName) {
            return { success: false, message: '❌ يرجى تحديد اسم الموظف', suggestions: ['عدل راتب أحمد إلى 10000', 'غير قسم محمد إلى HR'] };
        }

        try {
            const employee = await this.findEmployeeByName(employeeName, context.companyId);
            if (!employee) {
                return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
            }

            const updateData: any = {};
            const changes: string[] = [];

            if (salary) {
                const newSalary = parseFloat(salary.replace(/[^0-9.]/g, ''));
                if (!isNaN(newSalary)) {
                    updateData.salary = newSalary;
                    changes.push(`💰 الراتب → ${newSalary.toLocaleString('ar-SA')} ريال`);
                }
            }

            if (department) {
                const dept = await this.prisma.department.findFirst({
                    where: { companyId: context.companyId, name: { contains: department, mode: 'insensitive' } }
                });
                if (dept) {
                    updateData.departmentId = dept.id;
                    changes.push(`🏢 القسم → ${dept.name}`);
                }
            }

            if (jobTitle) {
                updateData.jobTitle = jobTitle;
                changes.push(`💼 المسمى → ${jobTitle}`);
            }

            if (status) {
                const statusMap: any = { 'نشط': 'ACTIVE', 'معلق': 'SUSPENDED', 'مستقيل': 'RESIGNED' };
                updateData.status = statusMap[status] || status.toUpperCase();
                changes.push(`📌 الحالة → ${status}`);
            }

            if (phone) {
                updateData.phone = phone;
                changes.push(`📱 الهاتف → ${phone}`);
            }

            if (email) {
                updateData.email = email;
                changes.push(`📧 البريد → ${email}`);
            }

            if (changes.length === 0) {
                return { success: false, message: '❌ لم يتم تحديد أي تغييرات', suggestions: ['عدل راتب أحمد إلى 10000', 'غير قسم محمد إلى IT'] };
            }

            await this.prisma.user.update({ where: { id: employee.id }, data: updateData });

            return {
                success: true,
                message: `✅ تم تحديث بيانات الموظف!\n\n👤 **${employee.firstName} ${employee.lastName}**\n\n${changes.join('\n')}`,
                suggestions: ['اعرض الموظفين', 'عدل موظف آخر']
            };
        } catch (e: any) {
            return { success: false, message: `❌ فشل تحديث الموظف: ${e.message}` };
        }
    }

    private async transferEmployeeAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { employeeName, newDepartment } = intent.params;
        return this.transferEmployee(`انقل ${employeeName} إلى قسم ${newDepartment}`, context);
    }

    private async approveLeaveAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { employeeName } = intent.params;
        return this.approveLeave(`وافق على إجازة ${employeeName}`, context);
    }

    private async rejectLeaveAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { employeeName } = intent.params;
        return this.rejectLeave(`ارفض إجازة ${employeeName}`, context);
    }

    private async addBonusAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { employeeName, amount, reason } = intent.params;
        return this.addBonus(`أضف مكافأة ${amount} لـ ${employeeName} ${reason ? `بسبب ${reason}` : ''}`, context);
    }

    private async addDeductionAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { employeeName, amount, reason } = intent.params;
        return this.addDeduction(`اخصم ${amount} من ${employeeName} ${reason ? `بسبب ${reason}` : ''}`, context);
    }

    private async sendNotificationAI(intent: ParsedIntent, context: ActionContext): Promise<ActionResult> {
        const { recipient, message, title } = intent.params;

        if (!message) {
            return { success: false, message: '❌ يرجى تحديد نص الإشعار', suggestions: ['ارسل إشعار "رسالتك" لأحمد', 'ارسل إشعار لكل الموظفين'] };
        }

        try {
            let targetUsers: any[] = [];
            let targetDesc = '';

            if (!recipient || recipient === 'الكل' || recipient === 'جميع الموظفين') {
                targetUsers = await this.prisma.user.findMany({
                    where: { companyId: context.companyId, status: 'ACTIVE' },
                    select: { id: true, firstName: true, lastName: true }
                });
                targetDesc = `جميع الموظفين (${targetUsers.length})`;
            } else {
                const emp = await this.findEmployeeByName(recipient, context.companyId);
                if (emp) {
                    targetUsers = [emp];
                    targetDesc = `${emp.firstName} ${emp.lastName}`;
                } else {
                    return { success: false, message: `❌ الموظف "${recipient}" غير موجود` };
                }
            }

            // Create notifications
            const notifications = targetUsers.map(user => ({
                userId: user.id,
                title: title || '📢 إشعار جديد',
                message: message,
                type: 'GENERAL',
                isRead: false,
                companyId: context.companyId,
                createdById: context.userId,
            }));

            await (this.prisma.notification as any).createMany({ data: notifications });

            return {
                success: true,
                message: `✅ تم إرسال الإشعار!\n\n📨 إلى: ${targetDesc}\n📝 الرسالة: ${message}`,
                suggestions: ['ارسل إشعار آخر', 'اعرض الإشعارات']
            };
        } catch (e: any) {
            return { success: false, message: `❌ فشل إرسال الإشعار: ${e.message}` };
        }
    }

    // ========== TASK ACTIONS ==========

    private async createTask(message: string, context: ActionContext): Promise<ActionResult> {
        const { title, assigneeName, priority } = this.parseTaskDetails(message);

        if (!title) {
            return {
                success: false,
                message: '❌ يرجى تحديد عنوان المهمة',
                suggestions: ['أضف مهمة "عنوان المهمة" لـ اسم الموظف']
            };
        }

        let assigneeId: string | null = null;
        if (assigneeName) {
            const assignee = await this.findEmployeeByName(assigneeName, context.companyId);
            if (!assignee) {
                return { success: false, message: `❌ الموظف "${assigneeName}" غير موجود` };
            }
            assigneeId = assignee.id;
        }

        const task = await (this.prisma.tasks.create as any)({
            data: {
                title,
                description: '',
                priority: priority || 'MEDIUM',
                status: 'PENDING',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                assigneeId,
                createdById: context.userId,
                companyId: context.companyId,
            },
            include: { assignee: { select: { firstName: true, lastName: true } } }
        });

        const assigneeText = task.assignee
            ? `👤 مسندة إلى: ${task.assignee.firstName} ${task.assignee.lastName}`
            : '👤 غير مسندة';

        return {
            success: true,
            message: `✅ تم إنشاء المهمة!\n\n📝 **${task.title}**\n${assigneeText}\n⚡ الأولوية: ${this.translatePriority(task.priority)}`,
            data: task,
            suggestions: ['اعرض المهام', 'أضف مهمة أخرى']
        };
    }

    private parseTaskDetails(message: string): { title: string; assigneeName?: string; priority?: string } {
        let title = '';
        let assigneeName: string | undefined;
        let priority: string | undefined;

        const quotedMatch = message.match(/[""]([^""]+)[""]/);
        if (quotedMatch) {
            title = quotedMatch[1];
        } else {
            const titleMatch = message.match(/مهم[ةه]\s+(.+?)(?:\s+ل[ـ]?\s*|\s+بأولوية|$)/i);
            if (titleMatch) title = titleMatch[1].trim();
        }

        const assigneeMatch = message.match(/(?:ل[ـ]?\s*|للموظف\s+)([^\s]+(?:\s+[^\s]+)?)/);
        if (assigneeMatch) {
            assigneeName = assigneeMatch[1].replace(/بأولوية.*/i, '').trim();
        }

        if (/عالية|عاجل|urgent|high/i.test(message)) priority = 'HIGH';
        else if (/منخفضة|low/i.test(message)) priority = 'LOW';
        else priority = 'MEDIUM';

        return { title, assigneeName, priority };
    }

    private async completeTask(message: string, context: ActionContext): Promise<ActionResult> {
        const titleMatch = message.match(/(?:مهمة|مهمه)\s+[""]?([^""]+)[""]?/);
        if (!titleMatch) {
            return { success: false, message: '❌ يرجى تحديد المهمة' };
        }

        const task = await this.prisma.tasks.findFirst({
            where: {
                companyId: context.companyId,
                title: { contains: titleMatch[1], mode: 'insensitive' }
            }
        });

        if (!task) {
            return { success: false, message: '❌ المهمة غير موجودة' };
        }

        await this.prisma.tasks.update({
            where: { id: task.id },
            data: { status: 'COMPLETED', completedAt: new Date() } as any
        });

        return {
            success: true,
            message: `✅ تم إنهاء المهمة "${task.title}" 🎉`,
            suggestions: ['اعرض المهام']
        };
    }

    // ========== CUSTODY ACTIONS ==========

    private async createCustodyItem(message: string, context: ActionContext): Promise<ActionResult> {
        const { name, serialNumber, assigneeName, value } = this.parseCustodyDetails(message);

        if (!name) {
            return {
                success: false,
                message: '❌ يرجى تحديد اسم العهدة',
                suggestions: ['أضف عهدة "لابتوب Dell" رقم ABC123']
            };
        }

        const item = await (this.prisma.custodyItem.create as any)({
            data: {
                name,
                description: '',
                serialNumber: serialNumber || null,
                companyId: context.companyId,
                status: 'AVAILABLE',
                condition: 'NEW',
                purchasePrice: value ? parseFloat(value) : null,
            }
        });

        if (assigneeName) {
            const assignee = await this.findEmployeeByName(assigneeName, context.companyId);
            if (assignee) {
                await (this.prisma.custodyAssignment.create as any)({
                    data: {
                        custodyItemId: item.id,
                        userId: assignee.id,
                        assignedById: context.userId,
                        status: 'ASSIGNED',
                        assignedAt: new Date(),
                        companyId: context.companyId,
                    }
                });

                return {
                    success: true,
                    message: `✅ تم إضافة وتسليم العهدة!\n\n📦 **${item.name}**\n👤 مسلمة إلى: ${assignee.firstName} ${assignee.lastName}`,
                    data: item
                };
            }
        }

        return {
            success: true,
            message: `✅ تم إضافة العهدة!\n\n📦 **${item.name}**\n🔢 الرقم التسلسلي: ${item.serialNumber || 'غير محدد'}`,
            data: item,
            suggestions: ['سلم العهدة لموظف', 'اعرض العهد']
        };
    }

    private parseCustodyDetails(message: string): { name: string; serialNumber?: string; assigneeName?: string; value?: string } {
        let name = '';
        let serialNumber: string | undefined;
        let assigneeName: string | undefined;
        let value: string | undefined;

        const quotedMatch = message.match(/[""]([^""]+)[""]/);
        if (quotedMatch) {
            name = quotedMatch[1];
        } else {
            const nameMatch = message.match(/(?:عهدة|عهده)\s+(.+?)(?:\s+رقم|\s+ل[ـ]?|$)/i);
            if (nameMatch) name = nameMatch[1].trim();
        }

        const serialMatch = message.match(/(?:رقم|serial)[:\s]*([^\s]+)/i);
        if (serialMatch) serialNumber = serialMatch[1];

        const assigneeMatch = message.match(/(?:ل[ـ]?\s*|للموظف\s+)([^\s]+(?:\s+[^\s]+)?)/);
        if (assigneeMatch) assigneeName = assigneeMatch[1].trim();

        const valueMatch = message.match(/(?:بقيمة|قيمة)\s*(\d+)/i);
        if (valueMatch) value = valueMatch[1];

        return { name, serialNumber, assigneeName, value };
    }

    private async assignCustody(message: string, context: ActionContext): Promise<ActionResult> {
        const { name, assigneeName } = this.parseCustodyDetails(message);

        if (!name || !assigneeName) {
            return {
                success: false,
                message: '❌ يرجى تحديد العهدة واسم الموظف',
                suggestions: ['سلم عهدة "لابتوب" لـ أحمد']
            };
        }

        const item = await this.prisma.custodyItem.findFirst({
            where: { companyId: context.companyId, name: { contains: name, mode: 'insensitive' }, status: 'AVAILABLE' }
        });

        if (!item) {
            return { success: false, message: `❌ العهدة "${name}" غير متاحة` };
        }

        const employee = await this.findEmployeeByName(assigneeName, context.companyId);
        if (!employee) {
            return { success: false, message: `❌ الموظف "${assigneeName}" غير موجود` };
        }

        await (this.prisma.custodyAssignment.create as any)({
            data: {
                custodyItemId: item.id,
                userId: employee.id,
                assignedById: context.userId,
                status: 'ASSIGNED',
                assignedAt: new Date(),
                companyId: context.companyId,
            }
        });

        await this.prisma.custodyItem.update({
            where: { id: item.id },
            data: { status: 'ASSIGNED' } as any
        });

        return {
            success: true,
            message: `✅ تم تسليم العهدة!\n\n📦 ${item.name}\n👤 إلى: ${employee.firstName} ${employee.lastName}`
        };
    }

    // ========== EMPLOYEE ACTIONS ==========

    private async createEmployee(message: string, context: ActionContext): Promise<ActionResult> {
        const { firstName, lastName, department, salary, jobTitle } = this.parseEmployeeDetails(message);

        if (!firstName) {
            return {
                success: false,
                message: '❌ يرجى تحديد اسم الموظف',
                suggestions: ['أضف موظف أحمد محمد في قسم IT براتب 8000']
            };
        }

        // Convert Arabic names to English for email
        const firstNameEn = this.arabicToEnglish(firstName);
        const lastNameEn = this.arabicToEnglish(lastName || 'user');
        const randomNum = Math.floor(Math.random() * 1000);
        const email = `${firstNameEn}.${lastNameEn}${randomNum}@company.com`;

        const existing = await this.prisma.user.findFirst({
            where: { email, companyId: context.companyId }
        });

        if (existing) {
            return { success: false, message: `❌ البريد ${email} مستخدم بالفعل` };
        }

        let departmentId: string | undefined;
        if (department) {
            const dept = await this.prisma.department.findFirst({
                where: { companyId: context.companyId, name: { contains: department, mode: 'insensitive' } }
            });
            departmentId = dept?.id;
        }

        const employee = await (this.prisma.user.create as any)({
            data: {
                firstName,
                lastName: lastName || '',
                email,
                password: '$2b$10$defaulthash',
                role: 'EMPLOYEE',
                status: 'ACTIVE',
                companyId: context.companyId,
                departmentId,
                salary: salary ? parseFloat(salary) : null,
                jobTitle: jobTitle || null,
                hireDate: new Date(),
            },
            include: { department: { select: { name: true } } }
        });

        return {
            success: true,
            message: `✅ تم إضافة الموظف!\n\n👤 **${employee.firstName} ${employee.lastName}**\n📧 ${employee.email}\n🏢 ${employee.department?.name || 'غير محدد'}\n💰 ${employee.salary ? `${Number(employee.salary).toLocaleString('ar-SA')} ريال` : 'غير محدد'}`,
            data: employee,
            suggestions: ['أضف موظف آخر', 'اعرض الموظفين']
        };
    }

    private parseEmployeeDetails(message: string): { firstName?: string; lastName?: string; department?: string; salary?: string; jobTitle?: string } {
        let firstName: string | undefined;
        let lastName: string | undefined;
        let department: string | undefined;
        let salary: string | undefined;

        const nameMatch = message.match(/(?:موظف|اسمه?)\s+([^\s]+)(?:\s+([^\s]+))?/);
        if (nameMatch) {
            firstName = nameMatch[1];
            lastName = nameMatch[2]?.replace(/في|قسم|براتب/g, '').trim();
        }

        const deptMatch = message.match(/(?:في|قسم)\s+([^\s]+)/);
        if (deptMatch) department = deptMatch[1].replace(/براتب.*/i, '').trim();

        const salaryMatch = message.match(/(?:براتب|راتب)\s*(\d+)/);
        if (salaryMatch) salary = salaryMatch[1];

        return { firstName, lastName, department, salary };
    }

    private async updateSalary(message: string, context: ActionContext): Promise<ActionResult> {
        const match = message.match(/(?:راتب|معاش)\s+([^\s]+(?:\s+[^\s]+)?)\s+(?:الي|إلى|=)\s*(\d+)/);

        if (!match) {
            return {
                success: false,
                message: '❌ يرجى تحديد الموظف والراتب',
                suggestions: ['عدل راتب أحمد إلى 10000']
            };
        }

        const employee = await this.findEmployeeByName(match[1], context.companyId);
        if (!employee) {
            return { success: false, message: `❌ الموظف غير موجود` };
        }

        const newSalary = parseFloat(match[2]);
        const oldSalary = Number(employee.salary) || 0;

        await this.prisma.user.update({
            where: { id: employee.id },
            data: { salary: newSalary } as any
        });

        const change = newSalary - oldSalary;

        return {
            success: true,
            message: `✅ تم تحديث الراتب!\n\n👤 ${employee.firstName} ${employee.lastName}\n💰 القديم: ${oldSalary.toLocaleString('ar-SA')} ريال\n💰 الجديد: ${newSalary.toLocaleString('ar-SA')} ريال\n📈 التغيير: ${change >= 0 ? '+' : ''}${change.toLocaleString('ar-SA')}`
        };
    }

    private async transferEmployee(message: string, context: ActionContext): Promise<ActionResult> {
        const match = message.match(/(?:انقل|نقل)\s+([^\s]+(?:\s+[^\s]+)?)\s+(?:الي|إلى)\s+(?:قسم\s+)?([^\s]+)/);

        if (!match) {
            return { success: false, message: '❌ يرجى تحديد الموظف والقسم', suggestions: ['انقل أحمد إلى قسم المبيعات'] };
        }

        const employee = await this.findEmployeeByName(match[1], context.companyId);
        if (!employee) {
            return { success: false, message: `❌ الموظف غير موجود` };
        }

        const dept = await this.prisma.department.findFirst({
            where: { companyId: context.companyId, name: { contains: match[2], mode: 'insensitive' } }
        });

        if (!dept) {
            return { success: false, message: `❌ القسم غير موجود` };
        }

        await this.prisma.user.update({
            where: { id: employee.id },
            data: { departmentId: dept.id }
        });

        return {
            success: true,
            message: `✅ تم نقل ${employee.firstName} ${employee.lastName} إلى قسم ${dept.name}`
        };
    }

    // ========== LEAVE ACTIONS ==========

    private async approveLeave(message: string, context: ActionContext): Promise<ActionResult> {
        const nameMatch = message.match(/(?:إجازة|طلب)\s+([^\s]+(?:\s+[^\s]+)?)/);

        let leave: any;
        if (nameMatch) {
            const employee = await this.findEmployeeByName(nameMatch[1], context.companyId);
            if (employee) {
                leave = await this.prisma.leaveRequest.findFirst({
                    where: { userId: employee.id, status: 'PENDING' },
                    include: { user: { select: { firstName: true, lastName: true } } },
                    orderBy: { createdAt: 'desc' }
                });
            }
        }

        if (!leave) {
            leave = await this.prisma.leaveRequest.findFirst({
                where: { companyId: context.companyId, status: 'PENDING' },
                include: { user: { select: { firstName: true, lastName: true } } },
                orderBy: { createdAt: 'desc' }
            });
        }

        if (!leave) {
            return { success: false, message: '❌ لا توجد طلبات إجازة معلقة' };
        }

        await this.prisma.leaveRequest.update({
            where: { id: leave.id },
            data: { status: 'APPROVED', reviewedById: context.userId, reviewedAt: new Date() } as any
        });

        return {
            success: true,
            message: `✅ تمت الموافقة على إجازة ${leave.user.firstName} ${leave.user.lastName}!`,
            suggestions: ['اعرض طلبات الإجازات']
        };
    }

    private async rejectLeave(message: string, context: ActionContext): Promise<ActionResult> {
        const nameMatch = message.match(/(?:إجازة|طلب)\s+([^\s]+(?:\s+[^\s]+)?)/);

        if (!nameMatch) {
            return { success: false, message: '❌ يرجى تحديد اسم الموظف' };
        }

        const employee = await this.findEmployeeByName(nameMatch[1], context.companyId);
        if (!employee) {
            return { success: false, message: `❌ الموظف غير موجود` };
        }

        const leave = await this.prisma.leaveRequest.findFirst({
            where: { userId: employee.id, status: 'PENDING' },
            include: { user: { select: { firstName: true, lastName: true } } }
        });

        if (!leave) {
            return { success: false, message: '❌ لا يوجد طلب إجازة معلق لهذا الموظف' };
        }

        await this.prisma.leaveRequest.update({
            where: { id: leave.id },
            data: { status: 'REJECTED', reviewedById: context.userId, reviewedAt: new Date() } as any
        });

        return {
            success: true,
            message: `❌ تم رفض إجازة ${leave.user.firstName} ${leave.user.lastName}`
        };
    }

    // ========== PAYROLL ACTIONS ==========

    private async addBonus(message: string, context: ActionContext): Promise<ActionResult> {
        const match = message.match(/(?:مكافأة|بونص)\s+(\d+)\s+(?:ل[ـ]?\s*)?([^\s]+(?:\s+[^\s]+)?)/);

        if (!match) {
            return {
                success: false,
                message: '❌ يرجى تحديد المبلغ والموظف',
                suggestions: ['أضف مكافأة 1000 لـ أحمد']
            };
        }

        const amount = parseFloat(match[1]);
        const employee = await this.findEmployeeByName(match[2], context.companyId);

        if (!employee) {
            return { success: false, message: `❌ الموظف غير موجود` };
        }

        return {
            success: true,
            message: `✅ تم تسجيل المكافأة!\n\n👤 ${employee.firstName} ${employee.lastName}\n💰 المبلغ: ${amount.toLocaleString('ar-SA')} ريال\n\n⚠️ ستضاف في الراتب القادم`,
            suggestions: ['اعرض مكافآت الشهر']
        };
    }

    private async addDeduction(message: string, context: ActionContext): Promise<ActionResult> {
        const match = message.match(/(?:خصم|اخصم)\s+(\d+)\s+(?:من\s+)?([^\s]+(?:\s+[^\s]+)?)/);

        if (!match) {
            return {
                success: false,
                message: '❌ يرجى تحديد المبلغ والموظف',
                suggestions: ['اخصم 500 من أحمد']
            };
        }

        const amount = parseFloat(match[1]);
        const employee = await this.findEmployeeByName(match[2], context.companyId);

        if (!employee) {
            return { success: false, message: `❌ الموظف غير موجود` };
        }

        return {
            success: true,
            message: `✅ تم تسجيل الخصم!\n\n👤 ${employee.firstName} ${employee.lastName}\n💸 المبلغ: ${amount.toLocaleString('ar-SA')} ريال\n\n⚠️ سيُخصم من الراتب القادم`
        };
    }

    // ========== DEPARTMENT ACTIONS ==========

    private async createDepartment(message: string, context: ActionContext): Promise<ActionResult> {
        const nameMatch = message.match(/(?:قسم|إدارة)\s+[""]?([^""]+)[""]?/);

        if (!nameMatch) {
            return { success: false, message: '❌ يرجى تحديد اسم القسم' };
        }

        try {
            // Find default branch for the company
            const branch = await this.prisma.branch.findFirst({
                where: { companyId: context.companyId }
            });

            if (!branch) {
                return {
                    success: false,
                    message: '❌ لا يوجد فرع في النظام. يرجى إنشاء فرع أولاً.',
                    suggestions: ['أضف فرع "الفرع الرئيسي"']
                };
            }

            const dept = await (this.prisma.department.create as any)({
                data: {
                    name: nameMatch[1],
                    companyId: context.companyId,
                    branchId: branch.id
                }
            });

            return {
                success: true,
                message: `✅ تم إنشاء قسم "${dept.name}" في فرع "${branch.name}"`,
                data: dept
            };
        } catch (e: any) {
            return { success: false, message: `❌ فشل إنشاء القسم: ${e.message}` };
        }
    }

    private async createBranch(message: string, context: ActionContext): Promise<ActionResult> {
        const nameMatch = message.match(/(?:فرع)\s+[""]?([^""]+)[""]?/);

        if (!nameMatch) {
            return { success: false, message: '❌ يرجى تحديد اسم الفرع' };
        }

        try {
            const branch = await (this.prisma.branch.create as any)({
                data: {
                    name: nameMatch[1],
                    companyId: context.companyId
                }
            });

            return {
                success: true,
                message: `✅ تم إنشاء فرع "${branch.name}"`,
                data: branch
            };
        } catch (e: any) {
            return { success: false, message: `❌ فشل إنشاء الفرع: ${e.message}` };
        }
    }

    // ========== NOTIFICATION ACTIONS ==========

    private async sendNotification(message: string, context: ActionContext): Promise<ActionResult> {
        const match = message.match(/(?:إشعار|رسالة)\s+[""]?([^""]+)[""]?\s+(?:ل[ـ]?\s*)([^\s]+)/);

        if (!match) {
            return {
                success: false,
                message: '❌ يرجى تحديد الرسالة والموظف',
                suggestions: ['أرسل إشعار "نص الرسالة" لـ أحمد']
            };
        }

        const employee = await this.findEmployeeByName(match[2], context.companyId);
        if (!employee) {
            return { success: false, message: `❌ الموظف غير موجود` };
        }

        try {
            await (this.prisma.notification.create as any)({
                data: {
                    userId: employee.id,
                    title: 'إشعار جديد',
                    body: match[1],
                    type: 'GENERAL',
                    companyId: context.companyId
                }
            });
        } catch (e) {
            // Schema might be different
        }

        return {
            success: true,
            message: `✅ تم إرسال الإشعار إلى ${employee.firstName} ${employee.lastName}`
        };
    }

    // ========== HELPERS ==========

    private async findEmployeeByName(name: string, companyId: string): Promise<any> {
        const nameParts = name.split(' ').filter(p => p.length > 1);
        if (nameParts.length === 0) return null;

        const employees = await this.prisma.user.findMany({
            where: { companyId },
            select: { id: true, firstName: true, lastName: true, salary: true }
        });

        const scored = employees.map(emp => {
            let score = 0;
            for (const part of nameParts) {
                if (emp.firstName?.toLowerCase().includes(part.toLowerCase())) score += 2;
                if (emp.lastName?.toLowerCase().includes(part.toLowerCase())) score += 2;
            }
            return { ...emp, score };
        });

        const matches = scored.filter(e => e.score > 0).sort((a, b) => b.score - a.score);
        return matches[0] || null;
    }

    private translatePriority(priority: string): string {
        const map: Record<string, string> = { 'HIGH': 'عالية 🔴', 'MEDIUM': 'متوسطة 🟡', 'LOW': 'منخفضة 🟢' };
        return map[priority] || priority;
    }

    private arabicToEnglish(text: string): string {
        const arabicToEnglishMap: Record<string, string> = {
            'أ': 'a', 'ا': 'a', 'إ': 'e', 'آ': 'a',
            'ب': 'b', 'ت': 't', 'ث': 'th',
            'ج': 'j', 'ح': 'h', 'خ': 'kh',
            'د': 'd', 'ذ': 'th', 'ر': 'r', 'ز': 'z',
            'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
            'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
            'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l',
            'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
            'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '',
            'ئ': 'e', 'ؤ': 'o', 'ـ': ''
        };

        let result = '';
        for (const char of text) {
            result += arabicToEnglishMap[char] || char;
        }

        // Remove non-alphanumeric and lowercase
        return result.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user';
    }

    private getActionSuggestions(): string[] {
        return [
            'أضف مهمة "عنوان" لـ اسم الموظف',
            'أضف عهدة "اسم العهدة" لـ اسم الموظف',
            'أضف موظف اسمه [الاسم] في قسم [القسم]',
            'عدل راتب [اسم] إلى [مبلغ]',
            'وافق على إجازة [اسم]',
            'أضف مكافأة [مبلغ] لـ [اسم]'
        ];
    }
}
