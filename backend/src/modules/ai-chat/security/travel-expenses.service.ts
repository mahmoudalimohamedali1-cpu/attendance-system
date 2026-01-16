import { Injectable, Logger } from '@nestjs/common';

/**
 * 🎫 Travel & Expenses Service
 * Implements remaining ideas: Business travel management
 * 
 * Features:
 * - Travel requests
 * - Per diem calculation
 * - Visa assistance
 * - Travel policy checker
 */

export interface TravelRequest {
    id: string;
    userId: string;
    userName: string;
    destination: string;
    purpose: string;
    departureDate: Date;
    returnDate: Date;
    estimatedCost: number;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
    approver?: string;
    createdAt: Date;
}

export interface PerDiem {
    country: string;
    countryAr: string;
    currency: string;
    daily: number;
    hotel: number;
    meals: number;
    transport: number;
}

export interface VisaInfo {
    country: string;
    countryAr: string;
    required: boolean;
    type: string;
    processingDays: number;
    documents: string[];
    cost: number;
}

export interface TravelPolicy {
    rule: string;
    ruleAr: string;
    applies: boolean;
    details: string;
}

@Injectable()
export class TravelExpensesService {
    private readonly logger = new Logger(TravelExpensesService.name);

    // Travel requests
    private requests: Map<string, TravelRequest> = new Map();

    // Per diem rates by country
    private readonly perDiemRates: PerDiem[] = [
        { country: 'UAE', countryAr: 'الإمارات', currency: 'AED', daily: 800, hotel: 500, meals: 200, transport: 100 },
        { country: 'Egypt', countryAr: 'مصر', currency: 'EGP', daily: 3000, hotel: 2000, meals: 700, transport: 300 },
        { country: 'Jordan', countryAr: 'الأردن', currency: 'JOD', daily: 150, hotel: 100, meals: 35, transport: 15 },
        { country: 'USA', countryAr: 'أمريكا', currency: 'USD', daily: 350, hotel: 200, meals: 100, transport: 50 },
        { country: 'UK', countryAr: 'بريطانيا', currency: 'GBP', daily: 250, hotel: 150, meals: 70, transport: 30 },
        { country: 'Germany', countryAr: 'ألمانيا', currency: 'EUR', daily: 280, hotel: 170, meals: 80, transport: 30 },
    ];

    // Visa requirements
    private readonly visaInfo: VisaInfo[] = [
        { country: 'UAE', countryAr: 'الإمارات', required: false, type: 'لا يلزم للسعوديين', processingDays: 0, documents: [], cost: 0 },
        { country: 'Egypt', countryAr: 'مصر', required: false, type: 'ختم الوصول', processingDays: 0, documents: ['جواز سفر ساري'], cost: 25 },
        { country: 'USA', countryAr: 'أمريكا', required: true, type: 'B1/B2', processingDays: 30, documents: ['جواز سفر', 'صور شخصية', 'خطاب عمل', 'كشف حساب'], cost: 160 },
        { country: 'UK', countryAr: 'بريطانيا', required: true, type: 'Standard Visitor', processingDays: 15, documents: ['جواز سفر', 'صور', 'خطاب عمل', 'حجز فندق'], cost: 100 },
        { country: 'Germany', countryAr: 'ألمانيا', required: true, type: 'Schengen', processingDays: 15, documents: ['جواز سفر', 'تأمين سفر', 'خطاب عمل', 'حجوزات'], cost: 80 },
    ];

    /**
     * ✈️ Create travel request
     */
    createRequest(
        userId: string,
        userName: string,
        destination: string,
        purpose: string,
        departureDate: Date,
        returnDate: Date
    ): TravelRequest {
        const id = `TRV-${Date.now().toString(36).toUpperCase()}`;

        // Calculate estimated cost
        const days = Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24));
        const perDiem = this.getPerDiem(destination);
        const estimatedCost = perDiem ? perDiem.daily * days : 1000 * days;

        const request: TravelRequest = {
            id,
            userId,
            userName,
            destination,
            purpose,
            departureDate,
            returnDate,
            estimatedCost,
            status: 'pending',
            createdAt: new Date(),
        };

        this.requests.set(id, request);
        return request;
    }

    /**
     * 💰 Get per diem rates
     */
    getPerDiem(country: string): PerDiem | null {
        return this.perDiemRates.find(p =>
            p.country.toLowerCase().includes(country.toLowerCase()) ||
            p.countryAr.includes(country)
        ) || null;
    }

    /**
     * 🛂 Get visa information
     */
    getVisaInfo(country: string): VisaInfo | null {
        return this.visaInfo.find(v =>
            v.country.toLowerCase().includes(country.toLowerCase()) ||
            v.countryAr.includes(country)
        ) || null;
    }

    /**
     * 📋 Check travel policy
     */
    checkPolicy(request: TravelRequest): TravelPolicy[] {
        const policies: TravelPolicy[] = [];
        const days = Math.ceil((request.returnDate.getTime() - request.departureDate.getTime()) / (1000 * 60 * 60 * 24));

        // Advance booking
        const daysToTravel = Math.ceil((request.departureDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        policies.push({
            rule: 'advance_booking',
            ruleAr: 'الحجز المسبق',
            applies: daysToTravel >= 14,
            details: daysToTravel >= 14 ? 'تم الحجز قبل 14 يوم ✓' : `⚠️ يفضل الحجز قبل 14 يوم (حالياً ${daysToTravel} يوم)`,
        });

        // Trip duration
        policies.push({
            rule: 'max_duration',
            ruleAr: 'مدة الرحلة',
            applies: days <= 14,
            details: days <= 14 ? `${days} أيام ✓` : `⚠️ تجاوزت الحد الأقصى (${days} يوم)`,
        });

        // Budget limit
        const budgetLimit = 15000;
        policies.push({
            rule: 'budget_limit',
            ruleAr: 'حد الميزانية',
            applies: request.estimatedCost <= budgetLimit,
            details: request.estimatedCost <= budgetLimit
                ? `${request.estimatedCost.toLocaleString()} ر.س ✓`
                : `⚠️ يتجاوز الحد (${request.estimatedCost.toLocaleString()} ر.س)`,
        });

        return policies;
    }

    /**
     * 📊 Format travel request
     */
    formatTravelRequest(request: TravelRequest): string {
        const statusEmoji = {
            draft: '📝',
            pending: '⏳',
            approved: '✅',
            rejected: '❌',
            completed: '✈️',
        }[request.status];

        const days = Math.ceil((request.returnDate.getTime() - request.departureDate.getTime()) / (1000 * 60 * 60 * 24));

        let message = `${statusEmoji} **طلب سفر #${request.id}**\n\n`;
        message += `📍 الوجهة: ${request.destination}\n`;
        message += `📋 الغرض: ${request.purpose}\n`;
        message += `📅 من: ${request.departureDate.toLocaleDateString('ar-SA')}\n`;
        message += `📅 إلى: ${request.returnDate.toLocaleDateString('ar-SA')}\n`;
        message += `⏱️ المدة: ${days} أيام\n`;
        message += `💰 التكلفة المقدرة: ${request.estimatedCost.toLocaleString()} ر.س`;

        return message;
    }

    /**
     * 📊 Format per diem info
     */
    formatPerDiem(country: string): string {
        const perDiem = this.getPerDiem(country);

        if (!perDiem) {
            return `❌ لا توجد معلومات عن "${country}"\n\nالدول المتاحة: ${this.perDiemRates.map(p => p.countryAr).join(', ')}`;
        }

        let message = `💰 **بدل السفر اليومي - ${perDiem.countryAr}:**\n\n`;
        message += `🏨 الفندق: ${perDiem.hotel} ${perDiem.currency}\n`;
        message += `🍽️ الوجبات: ${perDiem.meals} ${perDiem.currency}\n`;
        message += `🚕 المواصلات: ${perDiem.transport} ${perDiem.currency}\n`;
        message += `\n📊 **الإجمالي اليومي:** ${perDiem.daily} ${perDiem.currency}`;

        return message;
    }

    /**
     * 📊 Format visa info
     */
    formatVisaInfo(country: string): string {
        const visa = this.getVisaInfo(country);

        if (!visa) {
            return `❌ لا توجد معلومات عن "${country}"`;
        }

        let message = `🛂 **معلومات التأشيرة - ${visa.countryAr}:**\n\n`;

        if (!visa.required) {
            message += `✅ لا تحتاج تأشيرة مسبقة\n`;
            message += `📋 ${visa.type}`;
        } else {
            message += `⚠️ تأشيرة مطلوبة\n\n`;
            message += `📋 النوع: ${visa.type}\n`;
            message += `⏱️ مدة المعالجة: ${visa.processingDays} يوم\n`;
            message += `💰 التكلفة: ${visa.cost} دولار\n\n`;
            message += `📄 **المستندات المطلوبة:**\n`;
            for (const doc of visa.documents) {
                message += `• ${doc}\n`;
            }
        }

        return message;
    }

    /**
     * 📊 Format policy check
     */
    formatPolicyCheck(request: TravelRequest): string {
        const policies = this.checkPolicy(request);
        const allPassed = policies.every(p => p.applies);

        let message = `📋 **فحص سياسة السفر:**\n\n`;

        for (const policy of policies) {
            const emoji = policy.applies ? '✅' : '⚠️';
            message += `${emoji} ${policy.ruleAr}: ${policy.details}\n`;
        }

        message += `\n${allPassed ? '✅ جميع الشروط مستوفاة' : '⚠️ بعض الشروط تحتاج مراجعة'}`;

        return message;
    }
}
