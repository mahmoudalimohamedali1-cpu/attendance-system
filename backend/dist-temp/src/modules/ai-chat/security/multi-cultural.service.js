"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MultiCulturalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiCulturalService = void 0;
const common_1 = require("@nestjs/common");
let MultiCulturalService = MultiCulturalService_1 = class MultiCulturalService {
    constructor() {
        this.logger = new common_1.Logger(MultiCulturalService_1.name);
        this.culturalEvents = [
            { id: '1', name: 'Ramadan', nameAr: 'رمضان', date: new Date('2026-02-17'), endDate: new Date('2026-03-18'), type: 'islamic', typeAr: 'إسلامي', description: 'شهر الصيام المبارك', isHoliday: false, affectedCountries: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'EG'] },
            { id: '2', name: 'Eid Al-Fitr', nameAr: 'عيد الفطر', date: new Date('2026-03-19'), endDate: new Date('2026-03-23'), type: 'islamic', typeAr: 'إسلامي', description: 'عيد الفطر المبارك', isHoliday: true, affectedCountries: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'EG'] },
            { id: '3', name: 'Eid Al-Adha', nameAr: 'عيد الأضحى', date: new Date('2026-05-26'), endDate: new Date('2026-05-30'), type: 'islamic', typeAr: 'إسلامي', description: 'عيد الأضحى المبارك', isHoliday: true, affectedCountries: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'EG'] },
            { id: '4', name: 'Saudi National Day', nameAr: 'اليوم الوطني السعودي', date: new Date('2026-09-23'), type: 'national', typeAr: 'وطني', description: 'الذكرى السنوية لتوحيد المملكة', isHoliday: true, affectedCountries: ['SA'] },
            { id: '5', name: 'UAE National Day', nameAr: 'اليوم الوطني الإماراتي', date: new Date('2026-12-02'), type: 'national', typeAr: 'وطني', description: 'اليوم الوطني لدولة الإمارات', isHoliday: true, affectedCountries: ['AE'] },
            { id: '6', name: 'Founding Day', nameAr: 'يوم التأسيس', date: new Date('2026-02-22'), type: 'national', typeAr: 'وطني', description: 'ذكرى تأسيس الدولة السعودية', isHoliday: true, affectedCountries: ['SA'] },
        ];
        this.expatServices = [
            {
                id: '1', name: 'Iqama Renewal', nameAr: 'تجديد الإقامة', category: 'visa', categoryAr: 'تأشيرات',
                description: 'خطوات تجديد الإقامة',
                steps: ['تحديث بيانات الكفيل', 'دفع رسوم التجديد', 'زيارة الجوازات', 'استلام الإقامة'],
                documents: ['جواز السفر ساري', 'تأمين طبي', 'عقد عمل'],
                estimatedTime: '3-5 أيام عمل',
            },
            {
                id: '2', name: 'Family Visa', nameAr: 'تأشيرة عائلية', category: 'visa', categoryAr: 'تأشيرات',
                description: 'استقدام الزوجة والأبناء',
                steps: ['تقديم طلب في أبشر', 'دفع الرسوم', 'انتظار الموافقة', 'إصدار التأشيرة'],
                documents: ['عقد زواج مصدق', 'شهادات ميلاد الأبناء', 'إثبات الراتب'],
                estimatedTime: '2-4 أسابيع',
            },
            {
                id: '3', name: 'Bank Account', nameAr: 'فتح حساب بنكي', category: 'banking', categoryAr: 'بنوك',
                description: 'فتح حساب بنكي للوافدين',
                steps: ['اختيار البنك', 'حجز موعد', 'زيارة الفرع', 'تفعيل الحساب'],
                documents: ['إقامة سارية', 'خطاب تعريف من العمل', 'صورة شخصية'],
                estimatedTime: 'نفس اليوم',
            },
            {
                id: '4', name: 'Driving License', nameAr: 'رخصة القيادة', category: 'driving', categoryAr: 'قيادة',
                description: 'استخراج أو تحويل رخصة القيادة',
                steps: ['تقديم طلب في أبشر', 'الفحص الطبي', 'اختبار القيادة', 'استلام الرخصة'],
                documents: ['إقامة سارية', 'رخصة القيادة الأصلية', 'ترجمة معتمدة'],
                estimatedTime: '1-2 أسبوع',
            },
            {
                id: '5', name: 'School Enrollment', nameAr: 'تسجيل المدارس', category: 'education', categoryAr: 'تعليم',
                description: 'تسجيل الأبناء في المدارس',
                steps: ['اختيار المدرسة', 'تقديم الطلب', 'المقابلة', 'دفع الرسوم'],
                documents: ['شهادات دراسية سابقة', 'جواز السفر', 'صور شخصية', 'شهادات تطعيم'],
                estimatedTime: 'يختلف حسب المدرسة',
            },
        ];
        this.dialectPatterns = {
            khaleeji: { name: 'خليجي', examples: ['شلونك', 'وش', 'يالله', 'مشكور', 'زين'] },
            masri: { name: 'مصري', examples: ['ازيك', 'كويس', 'طيب', 'اهلا بيك', 'تمام'] },
            shami: { name: 'شامي', examples: ['كيفك', 'منيح', 'هلأ', 'شو', 'ماشي'] },
        };
    }
    getUpcomingEvents(days = 30, country) {
        const now = new Date();
        const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        return this.culturalEvents.filter(event => {
            const inRange = event.date >= now && event.date <= endDate;
            const matchesCountry = !country || event.affectedCountries.includes(country);
            return inRange && matchesCountry;
        }).sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    getRamadanStatus() {
        const now = new Date();
        const ramadan = this.culturalEvents.find(e => e.name === 'Ramadan');
        if (!ramadan || !ramadan.endDate) {
            return { isRamadan: false, message: 'معلومات رمضان غير متوفرة' };
        }
        if (now >= ramadan.date && now <= ramadan.endDate) {
            const daysRemaining = Math.ceil((ramadan.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return {
                isRamadan: true,
                daysRemaining,
                message: `🌙 رمضان كريم! ${daysRemaining} يوم متبقي`,
            };
        }
        if (now < ramadan.date) {
            const daysUntil = Math.ceil((ramadan.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return {
                isRamadan: false,
                daysUntil,
                message: `🌙 ${daysUntil} يوم حتى رمضان`,
            };
        }
        return { isRamadan: false, message: 'انتهى رمضان لهذا العام' };
    }
    detectDialect(text) {
        let maxMatches = 0;
        let detectedDialect = 'standard';
        let dialectAr = 'فصحى';
        for (const [dialect, data] of Object.entries(this.dialectPatterns)) {
            const matches = data.examples.filter(word => text.includes(word)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedDialect = dialect;
                dialectAr = data.name;
            }
        }
        return {
            dialect: detectedDialect,
            dialectAr,
            confidence: maxMatches > 0 ? Math.min(0.9, 0.5 + maxMatches * 0.1) : 0.5,
        };
    }
    getExpatService(serviceId) {
        return this.expatServices.find(s => s.id === serviceId) || null;
    }
    searchExpatServices(query) {
        const normalized = query.toLowerCase();
        return this.expatServices.filter(s => s.name.toLowerCase().includes(normalized) ||
            s.nameAr.includes(query) ||
            s.description.includes(query));
    }
    getWorldTimes() {
        const cities = [
            { city: 'Riyadh', cityAr: 'الرياض', timezone: 'Asia/Riyadh', offset: 3 },
            { city: 'Dubai', cityAr: 'دبي', timezone: 'Asia/Dubai', offset: 4 },
            { city: 'Cairo', cityAr: 'القاهرة', timezone: 'Africa/Cairo', offset: 2 },
            { city: 'London', cityAr: 'لندن', timezone: 'Europe/London', offset: 0 },
            { city: 'New York', cityAr: 'نيويورك', timezone: 'America/New_York', offset: -5 },
        ];
        return cities.map(city => ({
            ...city,
            currentTime: new Date().toLocaleTimeString('ar-SA', { timeZone: city.timezone }),
        }));
    }
    formatUpcomingEvents(country) {
        const events = this.getUpcomingEvents(60, country);
        if (events.length === 0) {
            return '📅 لا توجد مناسبات قريبة';
        }
        let message = '📅 **المناسبات القادمة:**\n\n';
        for (const event of events.slice(0, 5)) {
            const typeEmoji = { islamic: '🌙', national: '🇸🇦', international: '🌍', company: '🏢' }[event.type];
            message += `${typeEmoji} **${event.nameAr}**\n`;
            message += `   📆 ${event.date.toLocaleDateString('ar-SA')}`;
            if (event.endDate) {
                message += ` - ${event.endDate.toLocaleDateString('ar-SA')}`;
            }
            message += '\n';
            if (event.isHoliday) {
                message += `   🎉 يوم إجازة رسمية\n`;
            }
            message += '\n';
        }
        return message;
    }
    formatExpatServices() {
        let message = '🛂 **خدمات الوافدين:**\n\n';
        const categories = [...new Set(this.expatServices.map(s => s.categoryAr))];
        for (const category of categories) {
            const services = this.expatServices.filter(s => s.categoryAr === category);
            message += `📁 **${category}:**\n`;
            for (const service of services) {
                message += `   • ${service.nameAr}\n`;
            }
            message += '\n';
        }
        message += '💡 قل "معلومات [اسم الخدمة]" للتفاصيل';
        return message;
    }
    formatExpatServiceDetails(service) {
        let message = `🛂 **${service.nameAr}**\n\n`;
        message += `${service.description}\n\n`;
        message += `📋 **الخطوات:**\n`;
        for (let i = 0; i < service.steps.length; i++) {
            message += `${i + 1}. ${service.steps[i]}\n`;
        }
        message += `\n📄 **المستندات المطلوبة:**\n`;
        for (const doc of service.documents) {
            message += `• ${doc}\n`;
        }
        message += `\n⏱️ **الوقت المتوقع:** ${service.estimatedTime}`;
        return message;
    }
};
exports.MultiCulturalService = MultiCulturalService;
exports.MultiCulturalService = MultiCulturalService = MultiCulturalService_1 = __decorate([
    (0, common_1.Injectable)()
], MultiCulturalService);
//# sourceMappingURL=multi-cultural.service.js.map