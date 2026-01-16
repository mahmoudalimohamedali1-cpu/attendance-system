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
var SchemaDiscoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaDiscoveryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const fs = require("fs");
const path = require("path");
let SchemaDiscoveryService = SchemaDiscoveryService_1 = class SchemaDiscoveryService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SchemaDiscoveryService_1.name);
        this.cachedSchema = null;
        this.lastCacheTime = 0;
        this.CACHE_DURATION = 5 * 60 * 1000;
        this.schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    }
    invalidateCache() {
        this.cachedSchema = null;
        this.lastCacheTime = 0;
        this.logger.log('🔄 Schema cache invalidated - will refresh on next request');
    }
    readDynamicSchema() {
        try {
            const schemaContent = fs.readFileSync(this.schemaPath, 'utf-8');
            const fields = [];
            const modelRegex = /model\s+(\w+)\s+{([^}]+)}/g;
            let modelMatch;
            while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
                const modelName = modelMatch[1];
                const modelBody = modelMatch[2];
                const fieldRegex = /^\s+(\w+)\s+(String|Int|Float|Boolean|DateTime|Decimal|Json)(\?)?/gm;
                let fieldMatch;
                while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
                    const fieldName = fieldMatch[1];
                    const fieldType = fieldMatch[2];
                    if (['id', 'createdAt', 'updatedAt', 'userId', 'companyId'].includes(fieldName)) {
                        continue;
                    }
                    fields.push({
                        path: `${modelName}.${fieldName}`,
                        type: this.mapPrismaType(fieldType),
                        table: modelName,
                        description: `حقل ${fieldName} من جدول ${modelName}`,
                    });
                }
            }
            this.logger.log(`📊 Dynamic Schema: Found ${fields.length} fields from ${schemaContent.match(/model\s+\w+/g)?.length || 0} models`);
            return fields;
        }
        catch (error) {
            this.logger.error(`Failed to read Prisma schema: ${error.message}`);
            return [];
        }
    }
    mapPrismaType(prismaType) {
        const typeMap = {
            'String': 'String',
            'Int': 'Int',
            'Float': 'Decimal',
            'Boolean': 'Boolean',
            'DateTime': 'DateTime',
            'Decimal': 'Decimal',
            'Json': 'Json',
        };
        return typeMap[prismaType] || prismaType;
    }
    async getAllTables() {
        const dynamicFields = this.readDynamicSchema();
        const tables = [...new Set(dynamicFields.map(f => f.table))];
        return tables;
    }
    async getSearchableFields() {
        if (this.cachedSchema && (Date.now() - this.lastCacheTime < this.CACHE_DURATION)) {
            return this.cachedSchema;
        }
        const staticFields = [
            { path: 'Attendance.date', type: 'Date', table: 'Attendance', description: 'تاريخ يوم العمل' },
            { path: 'Attendance.checkIn', type: 'DateTime', table: 'Attendance', description: 'وقت تسجيل الحضور' },
            { path: 'Attendance.checkOut', type: 'DateTime', table: 'Attendance', description: 'وقت تسجيل الانصراف' },
            { path: 'Attendance.status', type: 'Enum', table: 'Attendance', description: 'حالة الحضور: PRESENT, ABSENT, LATE, EARLY_LEAVE - هذا الحقل يحدد إذا الموظف متأخر!' },
            { path: 'Attendance.lateMinutes', type: 'Int', table: 'Attendance', description: 'دقائق التأخير - إذا أكبر من 0 يعني الموظف متأخر!' },
            { path: 'Attendance.earlyDepartureMinutes', type: 'Int', table: 'Attendance', description: 'دقائق الخروج المبكر' },
            { path: 'Attendance.overtimeHours', type: 'Decimal', table: 'Attendance', description: 'ساعات العمل الإضافي' },
            { path: 'User.hireDate', type: 'DateTime', table: 'User', description: 'تاريخ التعيين' },
            { path: 'User.salary', type: 'Decimal', table: 'User', description: 'راتب الموظف' },
            { path: 'Contract.basicSalary', type: 'Decimal', table: 'Contract', description: 'الراتب الأساسي' },
        ];
        const dynamicFields = this.readDynamicSchema();
        const staticPaths = new Set(staticFields.map(f => f.path));
        const mergedFields = [
            ...staticFields,
            ...dynamicFields.filter(f => !staticPaths.has(f.path))
        ];
        this.cachedSchema = mergedFields;
        this.lastCacheTime = Date.now();
        this.logger.log(`📊 Schema discovered: ${staticFields.length} static + ${dynamicFields.length} dynamic = ${mergedFields.length} total fields`);
        return mergedFields;
    }
    async getCompactSchema() {
        const fields = await this.getSearchableFields();
        const byTable = {};
        for (const field of fields) {
            if (!byTable[field.table])
                byTable[field.table] = [];
            byTable[field.table].push(`${field.path.split('.')[1]} (${field.type})`);
        }
        let schema = '📊 الجداول والحقول المتاحة:\n';
        for (const [table, columns] of Object.entries(byTable)) {
            schema += `• ${table}: ${columns.join(', ')}\n`;
        }
        return schema;
    }
    parseFieldPath(fieldPath) {
        const parts = fieldPath.split('.');
        return {
            table: parts[0],
            field: parts[1] || parts[0]
        };
    }
};
exports.SchemaDiscoveryService = SchemaDiscoveryService;
exports.SchemaDiscoveryService = SchemaDiscoveryService = SchemaDiscoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SchemaDiscoveryService);
//# sourceMappingURL=schema-discovery.service.js.map