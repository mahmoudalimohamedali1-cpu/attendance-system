import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🔥 خدمة اكتشاف الـ Schema - DYNAMIC & SELF-LEARNING!
 * تقرأ هيكل الـ Database من schema.prisma مباشرة
 */
@Injectable()
export class SchemaDiscoveryService {
    private readonly logger = new Logger(SchemaDiscoveryService.name);
    private cachedSchema: any = null;
    private lastCacheTime: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق بس (بدل ساعة)
    private readonly schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 🔄 مسح الكاش - يُستدعى بعد Auto-Extend!
     */
    invalidateCache(): void {
        this.cachedSchema = null;
        this.lastCacheTime = 0;
        this.logger.log('🔄 Schema cache invalidated - will refresh on next request');
    }

    /**
     * 🔥 قراءة كل الـ Models والحقول من schema.prisma مباشرة!
     */
    private readDynamicSchema(): Array<{
        path: string;
        type: string;
        table: string;
        description: string;
    }> {
        try {
            const schemaContent = fs.readFileSync(this.schemaPath, 'utf-8');
            const fields: Array<{ path: string; type: string; table: string; description: string }> = [];

            // استخراج كل الـ models وحقولها
            const modelRegex = /model\s+(\w+)\s+{([^}]+)}/g;
            let modelMatch;

            while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
                const modelName = modelMatch[1];
                const modelBody = modelMatch[2];

                // استخراج الحقول (نتجاهل الـ relations والـ decorators المعقدة)
                const fieldRegex = /^\s+(\w+)\s+(String|Int|Float|Boolean|DateTime|Decimal|Json)(\?)?/gm;
                let fieldMatch;

                while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
                    const fieldName = fieldMatch[1];
                    const fieldType = fieldMatch[2];

                    // نتجاهل الحقول الأساسية
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
        } catch (error) {
            this.logger.error(`Failed to read Prisma schema: ${error.message}`);
            return [];
        }
    }

    /**
     * تحويل نوع Prisma لنوع مفهوم
     */
    private mapPrismaType(prismaType: string): string {
        const typeMap: Record<string, string> = {
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

    /**
     * الحصول على كل الجداول المتاحة في الـ Database
     */
    async getAllTables(): Promise<string[]> {
        const dynamicFields = this.readDynamicSchema();
        const tables = [...new Set(dynamicFields.map(f => f.table))];
        return tables;
    }

    /**
     * 🔥 الحصول على كل الحقول القابلة للبحث
     * يدمج الحقول الثابتة (مع الوصف) + الحقول الديناميكية (من schema.prisma)
     */
    async getSearchableFields(): Promise<Array<{
        path: string;
        type: string;
        table: string;
        description: string;
    }>> {
        // استخدام الكاش لتحسين الأداء
        if (this.cachedSchema && (Date.now() - this.lastCacheTime < this.CACHE_DURATION)) {
            return this.cachedSchema;
        }

        // الحقول الثابتة مع وصف واضح (الأساسية)
        const staticFields = [
            // === جدول الحضور (Attendance) ===
            { path: 'Attendance.date', type: 'Date', table: 'Attendance', description: 'تاريخ يوم العمل' },
            { path: 'Attendance.checkIn', type: 'DateTime', table: 'Attendance', description: 'وقت تسجيل الحضور' },
            { path: 'Attendance.checkOut', type: 'DateTime', table: 'Attendance', description: 'وقت تسجيل الانصراف' },
            { path: 'Attendance.status', type: 'Enum', table: 'Attendance', description: 'حالة الحضور: PRESENT, ABSENT, LATE, EARLY_LEAVE - هذا الحقل يحدد إذا الموظف متأخر!' },
            { path: 'Attendance.lateMinutes', type: 'Int', table: 'Attendance', description: 'دقائق التأخير - إذا أكبر من 0 يعني الموظف متأخر!' },
            { path: 'Attendance.earlyDepartureMinutes', type: 'Int', table: 'Attendance', description: 'دقائق الخروج المبكر' },
            { path: 'Attendance.overtimeHours', type: 'Decimal', table: 'Attendance', description: 'ساعات العمل الإضافي' },

            // === جدول الموظف (User) ===
            { path: 'User.hireDate', type: 'DateTime', table: 'User', description: 'تاريخ التعيين' },
            { path: 'User.salary', type: 'Decimal', table: 'User', description: 'راتب الموظف' },

            // === جدول العقد (Contract) ===
            { path: 'Contract.basicSalary', type: 'Decimal', table: 'Contract', description: 'الراتب الأساسي' },
        ];

        // 🔥 قراءة الحقول الديناميكية من schema.prisma
        const dynamicFields = this.readDynamicSchema();

        // دمج الحقول (الثابتة لها الأولوية لأن عندها وصف أفضل)
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

    /**
     * الحصول على schema مختصر للـ AI (لتقليل حجم الـ prompt)
     */
    async getCompactSchema(): Promise<string> {
        const fields = await this.getSearchableFields();

        // تجميع الحقول حسب الجدول
        const byTable: Record<string, string[]> = {};
        for (const field of fields) {
            if (!byTable[field.table]) byTable[field.table] = [];
            byTable[field.table].push(`${field.path.split('.')[1]} (${field.type})`);
        }

        // تحويل لنص مختصر
        let schema = '📊 الجداول والحقول المتاحة:\n';
        for (const [table, columns] of Object.entries(byTable)) {
            schema += `• ${table}: ${columns.join(', ')}\n`;
        }

        return schema;
    }

    /**
     * تحويل اسم حقل لاستعلام Prisma
     */
    parseFieldPath(fieldPath: string): { table: string; field: string } {
        const parts = fieldPath.split('.');
        return {
            table: parts[0],
            field: parts[1] || parts[0]
        };
    }
}
