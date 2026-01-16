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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeImportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const employee_import_service_1 = require("./services/employee-import.service");
let EmployeeImportController = class EmployeeImportController {
    constructor(importService) {
        this.importService = importService;
    }
    downloadTemplate(res) {
        const template = this.importService.generateTemplate();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.csv');
        res.send('\uFEFF' + template);
    }
    async validateImport(file, companyId) {
        if (!file) {
            throw new common_1.BadRequestException('لم يتم رفع أي ملف');
        }
        const content = file.buffer.toString('utf-8');
        const rows = this.importService.parseCSV(content);
        const validation = await this.importService.validateImport(rows, companyId);
        return {
            fileName: file.originalname,
            totalRows: rows.length,
            ...validation,
        };
    }
    async importEmployees(file, companyId) {
        if (!file) {
            throw new common_1.BadRequestException('لم يتم رفع أي ملف');
        }
        const content = file.buffer.toString('utf-8');
        const rows = this.importService.parseCSV(content);
        const validation = await this.importService.validateImport(rows, companyId);
        if (!validation.valid) {
            return {
                success: false,
                message: 'يوجد أخطاء في الملف',
                errors: validation.errors,
            };
        }
        const result = await this.importService.importEmployees(rows, companyId);
        return {
            ...result,
            message: result.success
                ? `تم استيراد ${result.created} موظف جديد وتحديث ${result.updated} موظف`
                : `تم الاستيراد مع بعض الأخطاء`,
        };
    }
    async previewImport(file) {
        if (!file) {
            throw new common_1.BadRequestException('لم يتم رفع أي ملف');
        }
        const content = file.buffer.toString('utf-8');
        const rows = this.importService.parseCSV(content);
        return {
            fileName: file.originalname,
            totalRows: rows.length,
            headers: this.importService.getTemplateHeaders(),
            preview: rows.slice(0, 5),
        };
    }
    async smartAnalyze(file) {
        if (!file) {
            throw new common_1.BadRequestException('لم يتم رفع أي ملف');
        }
        const content = file.buffer.toString('utf-8');
        const analysis = this.importService.smartAnalyzeCSV(content);
        return {
            fileName: file.originalname,
            ...analysis,
        };
    }
    async smartImport(file, mappingsJson, companyId) {
        if (!file) {
            throw new common_1.BadRequestException('لم يتم رفع أي ملف');
        }
        let mappings = {};
        if (mappingsJson) {
            try {
                mappings = JSON.parse(mappingsJson);
            }
            catch {
                throw new common_1.BadRequestException('صيغة المطابقات غير صحيحة');
            }
        }
        const content = file.buffer.toString('utf-8');
        const result = await this.importService.smartImportEmployees(content, companyId, mappings);
        return {
            ...result,
            message: result.success
                ? `تم استيراد ${result.created} موظف جديد وتحديث ${result.updated} موظف وإضافة ${result.customFieldsAdded} حقل مخصص`
                : 'تم الاستيراد مع بعض الأخطاء',
        };
    }
};
exports.EmployeeImportController = EmployeeImportController;
__decorate([
    (0, common_1.Get)('template'),
    (0, swagger_1.ApiOperation)({ summary: 'تحميل قالب استيراد الموظفين' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmployeeImportController.prototype, "downloadTemplate", null);
__decorate([
    (0, common_1.Post)('validate'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من صحة ملف الاستيراد قبل التنفيذ' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EmployeeImportController.prototype, "validateImport", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'استيراد الموظفين من ملف CSV' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EmployeeImportController.prototype, "importEmployees", null);
__decorate([
    (0, common_1.Post)('preview'),
    (0, swagger_1.ApiOperation)({ summary: 'معاينة أول 5 صفوف من الملف' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeeImportController.prototype, "previewImport", null);
__decorate([
    (0, common_1.Post)('smart-analyze'),
    (0, swagger_1.ApiOperation)({ summary: 'تحليل ذكي للملف مع اقتراح المطابقات' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeeImportController.prototype, "smartAnalyze", null);
__decorate([
    (0, common_1.Post)('smart-import'),
    (0, swagger_1.ApiOperation)({ summary: 'استيراد ذكي مع مطابقة مخصصة' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                mappings: { type: 'string', description: 'JSON object of column mappings' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('mappings')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], EmployeeImportController.prototype, "smartImport", null);
exports.EmployeeImportController = EmployeeImportController = __decorate([
    (0, swagger_1.ApiTags)('Employee Import'),
    (0, common_1.Controller)('users/import'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [employee_import_service_1.EmployeeImportService])
], EmployeeImportController);
//# sourceMappingURL=employee-import.controller.js.map