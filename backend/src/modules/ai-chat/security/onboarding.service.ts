import { Injectable, Logger } from '@nestjs/common';

/**
 * 👋 Onboarding Service
 * Implements idea #8: New employee onboarding bot
 * 
 * Features:
 * - Guided system tour
 * - Checklist tracking
 * - First week tasks
 * - Buddy matching
 */

export interface OnboardingChecklist {
    userId: string;
    userName: string;
    startDate: Date;
    progress: number;
    items: ChecklistItem[];
    buddy?: { name: string; email: string };
    department: string;
}

export interface ChecklistItem {
    id: string;
    title: string;
    titleAr: string;
    description: string;
    category: 'hr' | 'it' | 'team' | 'training' | 'compliance';
    dueDay: number; // Day number from start
    completed: boolean;
    completedAt?: Date;
    link?: string;
}

export interface SystemTourStep {
    id: number;
    title: string;
    titleAr: string;
    description: string;
    action: string;
    completed: boolean;
}

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    // Onboarding checklists (in-memory)
    private checklists: Map<string, OnboardingChecklist> = new Map();

    // Default checklist template
    private readonly checklistTemplate: Omit<ChecklistItem, 'completed' | 'completedAt'>[] = [
        // Day 1
        { id: '1', title: 'Complete HR paperwork', titleAr: 'إكمال أوراق الموارد البشرية', description: 'توقيع العقد والمستندات المطلوبة', category: 'hr', dueDay: 1 },
        { id: '2', title: 'Get IT credentials', titleAr: 'الحصول على بيانات الدخول', description: 'استلام البريد وكلمة المرور', category: 'it', dueDay: 1 },
        { id: '3', title: 'Set up workstation', titleAr: 'إعداد محطة العمل', description: 'تجهيز الكمبيوتر والمكتب', category: 'it', dueDay: 1 },
        { id: '4', title: 'Meet your buddy', titleAr: 'التعرف على الزميل المرشد', description: 'لقاء الزميل الذي سيساعدك', category: 'team', dueDay: 1 },

        // Day 2-3
        { id: '5', title: 'Complete system tour', titleAr: 'جولة في النظام', description: 'التعرف على أنظمة الشركة', category: 'it', dueDay: 2 },
        { id: '6', title: 'Meet team members', titleAr: 'التعرف على الفريق', description: 'لقاء أعضاء الفريق', category: 'team', dueDay: 2 },
        { id: '7', title: 'Review company policies', titleAr: 'مراجعة سياسات الشركة', description: 'قراءة دليل الموظف', category: 'compliance', dueDay: 3 },

        // Week 1
        { id: '8', title: 'Complete security training', titleAr: 'إكمال تدريب الأمان', description: 'تدريب الأمن السيبراني', category: 'training', dueDay: 5 },
        { id: '9', title: 'Set up benefits', titleAr: 'إعداد المزايا', description: 'التأمين الصحي والمزايا الأخرى', category: 'hr', dueDay: 5 },
        { id: '10', title: 'One-on-one with manager', titleAr: 'اجتماع مع المدير', description: 'لقاء فردي لمناقشة التوقعات', category: 'team', dueDay: 5 },

        // Week 2
        { id: '11', title: 'Complete department training', titleAr: 'تدريب القسم', description: 'التدريب الخاص بالقسم', category: 'training', dueDay: 10 },
        { id: '12', title: 'Review 30-day goals', titleAr: 'مراجعة أهداف 30 يوم', description: 'وضع أهداف الشهر الأول', category: 'team', dueDay: 14 },
    ];

    // System tour steps
    private readonly tourSteps: Omit<SystemTourStep, 'completed'>[] = [
        { id: 1, title: 'Dashboard', titleAr: 'لوحة التحكم', description: 'نظرة عامة على كل شيء', action: 'اذهب إلى الصفحة الرئيسية' },
        { id: 2, title: 'Attendance', titleAr: 'الحضور', description: 'تسجيل الحضور والانصراف', action: 'جرب تسجيل الحضور' },
        { id: 3, title: 'Leave Requests', titleAr: 'طلبات الإجازة', description: 'طلب الإجازات', action: 'استعرض رصيد إجازاتك' },
        { id: 4, title: 'Profile', titleAr: 'الملف الشخصي', description: 'بياناتك الشخصية', action: 'حدث معلوماتك' },
        { id: 5, title: 'AI Chat', titleAr: 'المساعد الذكي', description: 'اسأل أي سؤال', action: 'جرب سؤال المساعد' },
        { id: 6, title: 'Documents', titleAr: 'المستندات', description: 'الوصول للمستندات', action: 'استعرض المستندات المتاحة' },
    ];

    /**
     * 👋 Start onboarding for new employee
     */
    startOnboarding(userId: string, userName: string, department: string): OnboardingChecklist {
        const checklist: OnboardingChecklist = {
            userId,
            userName,
            startDate: new Date(),
            progress: 0,
            items: this.checklistTemplate.map(item => ({
                ...item,
                completed: false,
            })),
            department,
        };

        this.checklists.set(userId, checklist);
        return checklist;
    }

    /**
     * 📋 Get onboarding checklist
     */
    getChecklist(userId: string): OnboardingChecklist | null {
        return this.checklists.get(userId) || null;
    }

    /**
     * ✅ Complete checklist item
     */
    completeItem(userId: string, itemId: string): { success: boolean; message: string } {
        const checklist = this.checklists.get(userId);
        if (!checklist) {
            return { success: false, message: '❌ لم يتم العثور على قائمة المهام' };
        }

        const item = checklist.items.find(i => i.id === itemId);
        if (!item) {
            return { success: false, message: '❌ المهمة غير موجودة' };
        }

        if (item.completed) {
            return { success: false, message: '✅ المهمة مكتملة بالفعل' };
        }

        item.completed = true;
        item.completedAt = new Date();

        // Update progress
        const completed = checklist.items.filter(i => i.completed).length;
        checklist.progress = Math.round((completed / checklist.items.length) * 100);

        return {
            success: true,
            message: `✅ تم إكمال "${item.titleAr}"!\n\n📊 التقدم: ${checklist.progress}%`,
        };
    }

    /**
     * 🎯 Get next pending items
     */
    getNextItems(userId: string): ChecklistItem[] {
        const checklist = this.checklists.get(userId);
        if (!checklist) return [];

        const daysSinceStart = Math.floor(
            (new Date().getTime() - checklist.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return checklist.items
            .filter(item => !item.completed && item.dueDay <= daysSinceStart + 2)
            .slice(0, 3);
    }

    /**
     * 🎓 Get system tour
     */
    getSystemTour(userId: string): SystemTourStep[] {
        return this.tourSteps.map(step => ({ ...step, completed: false }));
    }

    /**
     * 📊 Format checklist as message
     */
    formatChecklist(userId: string): string {
        const checklist = this.checklists.get(userId);

        if (!checklist) {
            return '👋 مرحباً بك! يبدو أنك لست موظفاً جديداً.\n\nإذا كنت بحاجة لمساعدة، فقط اسأل!';
        }

        let message = `👋 **مرحباً ${checklist.userName}!**\n\n`;
        message += `📊 التقدم: ${checklist.progress}%\n`;
        message += `${this.getProgressBar(checklist.progress)}\n\n`;

        const nextItems = this.getNextItems(userId);
        if (nextItems.length > 0) {
            message += `📋 **المهام القادمة:**\n`;
            for (const item of nextItems) {
                message += `⬜ ${item.titleAr}\n   ${item.description}\n\n`;
            }
        }

        const completed = checklist.items.filter(i => i.completed);
        if (completed.length > 0) {
            message += `✅ **مكتمل:** ${completed.length}/${checklist.items.length}\n`;
        }

        if (checklist.buddy) {
            message += `\n👤 **زميلك المرشد:** ${checklist.buddy.name}\n📧 ${checklist.buddy.email}`;
        }

        return message;
    }

    private getProgressBar(percent: number): string {
        const filled = Math.floor(percent / 10);
        const empty = 10 - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * 🎓 Format system tour as message
     */
    formatSystemTour(): string {
        let message = '🎓 **جولة في النظام:**\n\n';

        for (const step of this.tourSteps) {
            message += `${step.id}️⃣ **${step.titleAr}**\n`;
            message += `   ${step.description}\n`;
            message += `   💡 ${step.action}\n\n`;
        }

        message += '❓ قل "التالي" للانتقال للخطوة التالية';
        return message;
    }

    /**
     * 👥 Assign buddy
     */
    assignBuddy(userId: string, buddyName: string, buddyEmail: string): { success: boolean; message: string } {
        const checklist = this.checklists.get(userId);
        if (!checklist) {
            return { success: false, message: '❌ لم يتم العثور على الموظف' };
        }

        checklist.buddy = { name: buddyName, email: buddyEmail };

        return {
            success: true,
            message: `✅ تم تعيين ${buddyName} كزميل مرشد!`,
        };
    }
}
