"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DataExportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataExportService = void 0;
const common_1 = require("@nestjs/common");
let DataExportService = DataExportService_1 = class DataExportService {
    constructor() {
        this.logger = new common_1.Logger(DataExportService_1.name);
        this.jobs = new Map();
        this.dataRequests = new Map();
        this.dataTypes = [
            { id: 'attendance', nameAr: 'سجلات الحضور' },
            { id: 'leaves', nameAr: 'الإجازات' },
            { id: 'payroll', nameAr: 'الرواتب' },
            { id: 'performance', nameAr: 'تقييم الأداء' },
            { id: 'profile', nameAr: 'الملف الشخصي' },
            { id: 'documents', nameAr: 'المستندات' },
            { id: 'training', nameAr: 'التدريب' },
        ];
    }
    createExport(userId, dataTypes, format, dateRange) {
        const id = `EXP-${Date.now().toString(36).toUpperCase()}`;
        const job = {
            id,
            userId,
            dataTypes,
            format,
            dateRange,
            status: 'queued',
            progress: 0,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
        this.jobs.set(id, job);
        this.processExport(job);
        return job;
    }
    processExport(job) {
        job.status = 'processing';
        const interval = setInterval(() => {
            job.progress += 20;
            if (job.progress >= 100) {
                job.status = 'ready';
                job.fileSize = 1024 * (100 + Math.random() * 500);
                job.downloadUrl = `/api/exports/${job.id}/download`;
                clearInterval(interval);
            }
        }, 500);
    }
    getExportStatus(jobId) {
        return this.jobs.get(jobId) || null;
    }
    requestData(userId, type) {
        const id = `REQ-${Date.now().toString(36).toUpperCase()}`;
        const typeNames = {
            access: 'طلب الوصول للبيانات',
            portability: 'طلب نقل البيانات',
            deletion: 'طلب حذف البيانات',
        };
        const request = {
            id,
            userId,
            type,
            typeAr: typeNames[type],
            status: 'pending',
            requestedAt: new Date(),
        };
        this.dataRequests.set(id, request);
        return request;
    }
    getUserExports(userId) {
        return Array.from(this.jobs.values())
            .filter(j => j.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    formatExportJob(job) {
        const statusEmoji = {
            queued: '⏳',
            processing: '🔄',
            ready: '✅',
            failed: '❌',
            expired: '⌛',
        }[job.status];
        const formatNames = {
            json: 'JSON',
            csv: 'CSV',
            pdf: 'PDF',
            excel: 'Excel',
        };
        let message = `${statusEmoji} **تصدير البيانات #${job.id}**\n\n`;
        message += `📋 البيانات: ${job.dataTypes.map(t => this.dataTypes.find(d => d.id === t)?.nameAr || t).join(', ')}\n`;
        message += `📄 الصيغة: ${formatNames[job.format]}\n`;
        if (job.status === 'processing') {
            const bar = '█'.repeat(job.progress / 10) + '░'.repeat(10 - job.progress / 10);
            message += `\n${bar} ${job.progress}%`;
        }
        else if (job.status === 'ready') {
            const sizeKB = Math.round((job.fileSize || 0) / 1024);
            message += `\n📦 الحجم: ${sizeKB} KB\n`;
            message += `⬇️ **جاهز للتحميل**`;
        }
        return message;
    }
    formatDataTypes() {
        let message = `📤 **أنواع البيانات المتاحة للتصدير:**\n\n`;
        for (const type of this.dataTypes) {
            message += `• ${type.nameAr}\n`;
        }
        message += `\n📄 **الصيغ المتاحة:**\n`;
        message += `• JSON (للأنظمة)\n`;
        message += `• CSV (للجداول)\n`;
        message += `• Excel (للتقارير)\n`;
        message += `• PDF (للطباعة)\n`;
        message += `\n💡 قل "صدّر [نوع البيانات] بصيغة [الصيغة]"`;
        return message;
    }
    formatDataRequest(request) {
        let message = `✅ **تم تقديم طلبك #${request.id}**\n\n`;
        message += `📋 النوع: ${request.typeAr}\n`;
        message += `📅 التاريخ: ${request.requestedAt.toLocaleDateString('ar-SA')}\n\n`;
        if (request.type === 'deletion') {
            message += `⚠️ سيتم مراجعة طلبك خلال 30 يوم\n`;
            message += `📧 ستصلك رسالة تأكيد`;
        }
        else {
            message += `⏳ سيتم تجهيز بياناتك خلال 48 ساعة`;
        }
        return message;
    }
};
exports.DataExportService = DataExportService;
exports.DataExportService = DataExportService = DataExportService_1 = __decorate([
    (0, common_1.Injectable)()
], DataExportService);
//# sourceMappingURL=data-export.service.js.map