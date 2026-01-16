import { Injectable, Logger } from '@nestjs/common';

/**
 * 💰 Expense Management Service
 * Implements idea #24: Photo receipt → auto-expense report
 * 
 * Features:
 * - Receipt text parsing
 * - Auto-categorization
 * - Expense submission
 */

export interface ExpenseItem {
    id: string;
    userId: string;
    userName: string;
    category: 'travel' | 'meals' | 'supplies' | 'transport' | 'accommodation' | 'other';
    categoryAr: string;
    amount: number;
    currency: string;
    description: string;
    date: Date;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'reimbursed';
    createdAt: Date;
}

export interface ExpenseReport {
    id: string;
    userId: string;
    items: ExpenseItem[];
    totalAmount: number;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

export interface ReceiptParseResult {
    success: boolean;
    vendor?: string;
    amount?: number;
    date?: Date;
    category?: ExpenseItem['category'];
    confidence: number;
}

@Injectable()
export class ExpenseManagementService {
    private readonly logger = new Logger(ExpenseManagementService.name);

    // In-memory storage
    private expenses: Map<string, ExpenseItem> = new Map();

    // Category mapping
    private readonly categoryMapping: Record<ExpenseItem['category'], string> = {
        travel: 'السفر',
        meals: 'الوجبات',
        supplies: 'المستلزمات',
        transport: 'المواصلات',
        accommodation: 'الإقامة',
        other: 'أخرى',
    };

    // Vendor to category mapping
    private readonly vendorCategories: Record<string, ExpenseItem['category']> = {
        'uber': 'transport',
        'careem': 'transport',
        'كريم': 'transport',
        'starbucks': 'meals',
        'ستاربكس': 'meals',
        'mcdonalds': 'meals',
        'jarir': 'supplies',
        'جرير': 'supplies',
        'hotel': 'accommodation',
        'فندق': 'accommodation',
        'saudia': 'travel',
        'flynas': 'travel',
        'طيران': 'travel',
    };

    /**
     * 📸 Parse receipt from description/OCR
     */
    parseReceipt(receiptText: string): ReceiptParseResult {
        const text = receiptText.toLowerCase();

        // Extract amount
        const amountMatch = text.match(/(\d+(?:\.\d{2})?)\s*(ر\.?س|ريال|sar|sr)?/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;

        // Extract date
        const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        let date: Date | undefined;
        if (dateMatch) {
            const year = dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3]);
            date = new Date(year, parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
        }

        // Detect vendor and category
        let vendor: string | undefined;
        let category: ExpenseItem['category'] = 'other';

        for (const [vendorKey, cat] of Object.entries(this.vendorCategories)) {
            if (text.includes(vendorKey)) {
                vendor = vendorKey;
                category = cat;
                break;
            }
        }

        const confidence = (amount ? 0.3 : 0) + (date ? 0.2 : 0) + (vendor ? 0.3 : 0) + 0.2;

        return {
            success: confidence > 0.5,
            vendor,
            amount,
            date: date || new Date(),
            category,
            confidence,
        };
    }

    /**
     * ➕ Create expense from natural language
     */
    createExpense(
        userId: string,
        userName: string,
        message: string
    ): { success: boolean; expense?: ExpenseItem; message: string } {
        const parsed = this.parseReceipt(message);

        if (!parsed.success || !parsed.amount) {
            return {
                success: false,
                message: '❌ لم أتمكن من استخراج المبلغ من الرسالة.\n\nمثال: "صرفت 150 ريال غداء مع العميل"',
            };
        }

        const expenseId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const expense: ExpenseItem = {
            id: expenseId,
            userId,
            userName,
            category: parsed.category!,
            categoryAr: this.categoryMapping[parsed.category!],
            amount: parsed.amount,
            currency: 'SAR',
            description: message,
            date: parsed.date || new Date(),
            status: 'draft',
            createdAt: new Date(),
        };

        this.expenses.set(expenseId, expense);

        return {
            success: true,
            expense,
            message: `✅ تم إضافة المصروف!\n\n💰 المبلغ: ${expense.amount} ر.س\n📁 التصنيف: ${expense.categoryAr}\n📅 التاريخ: ${expense.date.toLocaleDateString('ar-SA')}\n\nهل تريد تقديم الطلب للموافقة؟`,
        };
    }

    /**
     * 📤 Submit expense for approval
     */
    submitExpense(expenseId: string): { success: boolean; message: string } {
        const expense = this.expenses.get(expenseId);

        if (!expense) {
            return { success: false, message: '❌ لم يتم العثور على المصروف' };
        }

        expense.status = 'pending';

        return {
            success: true,
            message: `✅ تم تقديم طلب المصروف للموافقة!\n\n💰 ${expense.amount} ر.س - ${expense.categoryAr}\n\n⏳ بانتظار موافقة المدير`,
        };
    }

    /**
     * ✅ Approve expense
     */
    approveExpense(expenseId: string): { success: boolean; message: string } {
        const expense = this.expenses.get(expenseId);

        if (!expense) {
            return { success: false, message: '❌ لم يتم العثور على المصروف' };
        }

        expense.status = 'approved';

        return {
            success: true,
            message: `✅ تمت الموافقة على المصروف!\n\n💰 ${expense.amount} ر.س - ${expense.userName}`,
        };
    }

    /**
     * 📋 Get user's expenses
     */
    getUserExpenses(userId: string): ExpenseItem[] {
        const userExpenses: ExpenseItem[] = [];

        for (const [, expense] of this.expenses) {
            if (expense.userId === userId) {
                userExpenses.push(expense);
            }
        }

        return userExpenses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * 📊 Get expense summary
     */
    getExpenseSummary(userId: string): string {
        const expenses = this.getUserExpenses(userId);

        if (expenses.length === 0) {
            return '📋 لا توجد مصروفات مسجلة.\n\nلإضافة مصروف:\n"صرفت 100 ريال [الوصف]"';
        }

        const thisMonth = expenses.filter(e => {
            const now = new Date();
            return e.date.getMonth() === now.getMonth() && e.date.getFullYear() === now.getFullYear();
        });

        const total = thisMonth.reduce((sum, e) => sum + e.amount, 0);
        const pending = expenses.filter(e => e.status === 'pending').length;
        const approved = expenses.filter(e => e.status === 'approved').length;

        let message = `💰 **ملخص المصروفات**\n\n`;
        message += `📅 مصروفات الشهر: ${total.toLocaleString()} ر.س\n`;
        message += `⏳ بانتظار الموافقة: ${pending}\n`;
        message += `✅ تمت الموافقة: ${approved}\n\n`;

        if (thisMonth.length > 0) {
            message += `**آخر المصروفات:**\n`;
            for (const exp of thisMonth.slice(0, 5)) {
                const statusEmoji = { draft: '📝', pending: '⏳', approved: '✅', rejected: '❌', reimbursed: '💵' }[exp.status];
                message += `${statusEmoji} ${exp.amount} ر.س - ${exp.categoryAr}\n`;
            }
        }

        return message;
    }
}
