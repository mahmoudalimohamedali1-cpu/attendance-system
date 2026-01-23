import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

export interface SchemaField {
    name: string;
    type: string;
    isOptional: boolean;
    isArray: boolean;
    isRelation: boolean;
    dbColumn?: string;
    description?: string;
}

export interface SchemaModel {
    name: string;
    tableName: string;
    fields: SchemaField[];
    relations: string[];
}

export interface SchemaEnum {
    name: string;
    values: string[];
}

export interface SchemaInfo {
    models: Map<string, SchemaModel>;
    enums: Map<string, SchemaEnum>;
    availableFields: string[]; // مثل: "User.email", "CustodyReturn.replacementValue"
}

@Injectable()
export class SchemaIntrospectorService implements OnModuleInit {
    private readonly logger = new Logger(SchemaIntrospectorService.name);
    private schemaInfo: SchemaInfo = {
        models: new Map(),
        enums: new Map(),
        availableFields: [],
    };

    async onModuleInit() {
        await this.loadSchema();
    }

    /**
     * تحميل وتحليل Prisma Schema
     */
    async loadSchema(): Promise<void> {
        try {
            const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");

            if (!fs.existsSync(schemaPath)) {
                this.logger.warn("Prisma schema file not found at: " + schemaPath);
                return;
            }

            const schemaContent = fs.readFileSync(schemaPath, "utf-8");
            this.parseSchema(schemaContent);

            this.logger.log("Schema loaded successfully: " + this.schemaInfo.models.size + " models, " + this.schemaInfo.enums.size + " enums");
        } catch (error) {
            this.logger.error("Failed to load schema: " + error.message);
        }
    }

    /**
     * تحليل محتوى الـ Schema
     */
    private parseSchema(content: string): void {
        // تحليل الـ Enums
        const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
        let enumMatch;
        while ((enumMatch = enumRegex.exec(content)) !== null) {
            const enumName = enumMatch[1];
            const enumBody = enumMatch[2];
            const values = enumBody
                .split("\n")
                .map(line => line.trim())
                .filter(line => line && !line.startsWith("//"))
                .map(line => line.split(" ")[0].trim());

            this.schemaInfo.enums.set(enumName, { name: enumName, values });
        }

        // تحليل الـ Models
        const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
        let modelMatch;
        while ((modelMatch = modelRegex.exec(content)) !== null) {
            const modelName = modelMatch[1];
            const modelBody = modelMatch[2];

            const model = this.parseModel(modelName, modelBody);
            this.schemaInfo.models.set(modelName, model);

            // إضافة الحقول للقائمة المسطحة
            model.fields.forEach(field => {
                if (!field.isRelation) {
                    this.schemaInfo.availableFields.push(modelName + "." + field.name);
                }
            });
        }
    }

    /**
     * تحليل Model واحد
     */
    private parseModel(name: string, body: string): SchemaModel {
        const fields: SchemaField[] = [];
        const relations: string[] = [];
        let tableName = name.toLowerCase() + "s"; // افتراضي

        const lines = body.split("\n");

        for (const line of lines) {
            const trimmedLine = line.trim();

            // تجاهل السطور الفارغة والتعليقات
            if (!trimmedLine || trimmedLine.startsWith("//")) continue;

            // البحث عن @@map
            const mapMatch = trimmedLine.match(/@@map\("([^"]+)"\)/);
            if (mapMatch) {
                tableName = mapMatch[1];
                continue;
            }

            // تجاهل الـ directives الأخرى
            if (trimmedLine.startsWith("@@")) continue;

            // تحليل الحقول
            const fieldMatch = trimmedLine.match(/^(\w+)\s+(\w+)(\[\])?\??/);
            if (fieldMatch) {
                const fieldName = fieldMatch[1];
                const fieldType = fieldMatch[2];
                const isArray = !!fieldMatch[3];
                const isOptional = trimmedLine.includes("?");

                // تحديد إذا كان علاقة
                const isRelation = this.schemaInfo.models.has(fieldType) ||
                    fieldType.match(/^[A-Z]/) !== null;

                // البحث عن @map
                const columnMatch = trimmedLine.match(/@map\("([^"]+)"\)/);
                const dbColumn = columnMatch ? columnMatch[1] : undefined;

                fields.push({
                    name: fieldName,
                    type: fieldType,
                    isOptional,
                    isArray,
                    isRelation,
                    dbColumn,
                });

                if (isRelation && !isArray) {
                    relations.push(fieldType);
                }
            }
        }

        return { name, tableName, fields, relations };
    }

    /**
     * الحصول على معلومات الـ Schema
     */
    getSchemaInfo(): SchemaInfo {
        return this.schemaInfo;
    }

    /**
     * البحث عن حقل معين
     */
    findField(fieldPath: string): { found: boolean; model?: SchemaModel; field?: SchemaField } {
        // fieldPath مثل: "CustodyReturn.replacementValue" أو "custody.replacementValue"
        const parts = fieldPath.split(".");
        if (parts.length < 2) {
            return { found: false };
        }

        // محاولة إيجاد الـ Model
        let modelName = parts[0];
        const fieldName = parts[parts.length - 1];

        // تحويل الاسم الصغير للاسم الكبير
        const modelNameCapitalized = modelName.charAt(0).toUpperCase() + modelName.slice(1);

        let model = this.schemaInfo.models.get(modelName) ||
            this.schemaInfo.models.get(modelNameCapitalized);

        // البحث في أسماء الجداول
        if (!model) {
            for (const [name, m] of this.schemaInfo.models) {
                if (m.tableName === modelName ||
                    name.toLowerCase() === modelName.toLowerCase()) {
                    model = m;
                    break;
                }
            }
        }

        if (!model) {
            return { found: false };
        }

        const field = model.fields.find(f =>
            f.name === fieldName ||
            f.dbColumn === fieldName ||
            f.name.toLowerCase() === fieldName.toLowerCase()
        );

        if (!field) {
            return { found: false, model };
        }

        return { found: true, model, field };
    }

    /**
     * الحصول على كل الحقول المتاحة لنوع معين
     */
    getFieldsForCategory(category: string): string[] {
        const categoryMappings: Record<string, string[]> = {
            employee: ["User", "Employee"],
            attendance: ["Attendance", "AttendanceRecord"],
            leave: ["LeaveRequest", "LeaveType", "LeaveBalance"],
            custody: ["CustodyItem", "CustodyAssignment", "CustodyReturn", "CustodyTransfer"],
            payroll: ["PayrollRun", "PayrollItem", "PayrollAdjustment", "SalaryComponent"],
            contract: ["Contract"],
            disciplinary: ["DisciplinaryCase", "DisciplinaryAction"],
            performance: ["PerformanceReview", "PerformanceRating"],
            department: ["Department"],
            branch: ["Branch"],
        };

        const modelNames = categoryMappings[category.toLowerCase()] || [];
        const fields: string[] = [];

        for (const modelName of modelNames) {
            const model = this.schemaInfo.models.get(modelName);
            if (model) {
                model.fields
                    .filter(f => !f.isRelation)
                    .forEach(f => fields.push(modelName + "." + f.name));
            }
        }

        return fields;
    }

    /**
     * التحقق من وجود Enum معين
     */
    hasEnum(enumName: string): boolean {
        return this.schemaInfo.enums.has(enumName);
    }

    /**
     * الحصول على قيم Enum
     */
    getEnumValues(enumName: string): string[] {
        const enumInfo = this.schemaInfo.enums.get(enumName);
        return enumInfo ? enumInfo.values : [];
    }

    /**
     * اقتراح حقول مشابهة لحقل غير موجود
     */
    suggestSimilarFields(fieldPath: string): string[] {
        const fieldName = fieldPath.split(".").pop()?.toLowerCase() || "";
        const suggestions: string[] = [];

        for (const availableField of this.schemaInfo.availableFields) {
            const availableFieldName = availableField.split(".").pop()?.toLowerCase() || "";

            // تطابق جزئي
            if (availableFieldName.includes(fieldName) ||
                fieldName.includes(availableFieldName) ||
                this.similarity(fieldName, availableFieldName) > 0.6) {
                suggestions.push(availableField);
            }
        }

        return suggestions.slice(0, 5);
    }

    /**
     * حساب التشابه بين نصين (Levenshtein-based)
     */
    private similarity(s1: string, s2: string): number {
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;

        if (longer.length === 0) return 1.0;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    private levenshteinDistance(s1: string, s2: string): number {
        const costs: number[] = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }
}
