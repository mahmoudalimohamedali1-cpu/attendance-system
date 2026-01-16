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
var AiSchemaGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSchemaGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const fs = require("fs");
const path = require("path");
let AiSchemaGeneratorService = AiSchemaGeneratorService_1 = class AiSchemaGeneratorService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.logger = new common_1.Logger(AiSchemaGeneratorService_1.name);
        this.schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    }
    async analyzePolicy(policyText) {
        this.logger.log(`🔍 Analyzing policy for missing fields: "${policyText.substring(0, 50)}..."`);
        let fullSchemaInfo = '';
        try {
            const schemaContent = fs.readFileSync(this.schemaPath, 'utf-8');
            fullSchemaInfo = this.extractSchemaInfo(schemaContent);
        }
        catch (e) {
            fullSchemaInfo = `User: id, email, salary, hireDate, nationality, isSaudi, managerId
Attendance: checkIn, checkOut, lateMinutes, overtimeMinutes
LeaveRequest: type, startDate, endDate, status
Contract: basicSalary, totalSalary, startDate, endDate`;
        }
        const prompt = `
أنت AI ذكي جداً متخصص في تحليل أنظمة الموارد البشرية (HRMS).

📝 السياسة المطلوبة:
"${policyText}"

📊 الـ Schema الموجود حالياً (كل الـ models وحقولها):
${fullSchemaInfo}

🎯 مهمتك:
1. افهم السياسة جيداً واستخرج كل المتطلبات (مثلاً: سن الطفل، جنس الموظف، المسافة المقطوعة).
2. ابحث في الـ Schema المقرؤة أعلاه: هل توجد حقول أو جداول تغطي هذه المتطلبات؟
3. إذا وجدت "موظف" (User) ابحث عن حقول فرعية متعلقة به (مثل child_age, has_car).
4. إذا كان المفهوم يتطلب جدولاً جديداً (مثل Dependents للزوجة والأبناء) وهو غير موجود → canExecute: false.

⚠️ تحذير شديد: لا تفترض وجود حقول غير مكتوبة في الـ Schema أعلاه. إذا لم تجد حقل "عمر الطفل" أو "اسم الزوجة" صراحةً، فإنه غير موجود.

🔍 القاعدة الذهبية:
أي مفهوم مالي أو إداري في السياسة (مثل "مبيعات"، "أطفال"، "سيارة") لا يوجد له حقل مقابل في الـ Schema أعلاه يعني أن canExecute = false فوراً.

أرجع JSON فقط:
{
  "requiredConcepts": ["قائمة بكل المفاهيم المطلوبة"],
  "existsInSchema": ["المفاهيم الموجودة"],
  "missingFromSchema": ["المفاهيم الغائبة تماماً"],
  "missingFields": [
    { "name": "fieldName", "type": "Int|String|Float", "description": "وصف دقيق", "suggestedModel": "الجدول المقترح" }
  ],
  "suggestedModels": [
    { "name": "ModelName", "fields": [{ "name": "field", "type": "type", "description": "desc" }] }
  ],
  "canExecute": false, // يجب أن يكون false إذا غاب أي مفهوم
  "reason": "شرح مفصل لسبب غياب البيانات"
}
`;
        try {
            const response = await this.aiService.generateContent(prompt, 'أنت AI متخصص في تحليل Schema. أرجع JSON فقط. إذا السياسة عن سيارات/كيلومترات، canExecute يجب أن يكون false.');
            const result = this.aiService.parseJsonResponse(response);
            this.logger.log(`Found ${result.missingFields?.length || 0} missing fields, ${result.suggestedModels?.length || 0} suggested models, canExecute: ${result.canExecute}`);
            this.logger.log(`AI Reason: ${result.reason || 'No reason provided'}`);
            const generatedModels = result.suggestedModels.map(model => ({
                name: model.name,
                prismaSchema: this.generatePrismaModelSchema(model.name, model.fields),
                fields: model.fields
            }));
            return {
                missingFields: result.missingFields,
                suggestedModels: generatedModels,
                canExecute: result.canExecute
            };
        }
        catch (error) {
            this.logger.error(`Failed to analyze policy: ${error.message}`);
            const smartFallback = this.generateSmartFallback(policyText);
            if (smartFallback.suggestedModels.length > 0) {
                this.logger.log(`Smart Fallback activated: Found ${smartFallback.suggestedModels.length} suggested models based on keywords`);
                return smartFallback;
            }
            return { missingFields: [], suggestedModels: [], canExecute: false };
        }
    }
    generateSmartFallback(policyText) {
        const missingFields = [];
        const suggestedModels = [];
        const lowerText = policyText.toLowerCase();
        if (/طفل|أطفال|أبناء|ابن|بنت|معال|معالين|زوج|زوجة|أسرة/.test(policyText)) {
            missingFields.push({ name: 'childAge', type: 'Int', description: 'عمر الطفل', suggestedModel: 'Dependent' }, { name: 'childGender', type: 'String', description: 'جنس الطفل (ذكر/أنثى)', suggestedModel: 'Dependent' }, { name: 'relationship', type: 'String', description: 'صلة القرابة', suggestedModel: 'Dependent' });
            suggestedModels.push({
                name: 'Dependent',
                prismaSchema: this.generatePrismaModelSchema('Dependent', [
                    { name: 'name', type: 'String', description: 'اسم المعال' },
                    { name: 'age', type: 'Int', description: 'العمر' },
                    { name: 'gender', type: 'String', description: 'الجنس' },
                    { name: 'relationship', type: 'String', description: 'صلة القرابة' },
                    { name: 'birthDate', type: 'DateTime', description: 'تاريخ الميلاد' }
                ]),
                fields: [
                    { name: 'name', type: 'String', description: 'اسم المعال' },
                    { name: 'age', type: 'Int', description: 'العمر' },
                    { name: 'gender', type: 'String', description: 'الجنس' },
                    { name: 'relationship', type: 'String', description: 'صلة القرابة' },
                    { name: 'birthDate', type: 'DateTime', description: 'تاريخ الميلاد' }
                ]
            });
        }
        if (/سيار|كيلو|مسافة|بنزين|وقود|رحل|مواصلات/.test(policyText)) {
            missingFields.push({ name: 'hasVehicle', type: 'Boolean', description: 'هل يملك سيارة', suggestedModel: 'User' }, { name: 'monthlyDistance', type: 'Float', description: 'المسافة الشهرية بالكيلو', suggestedModel: 'VehicleLog' });
            suggestedModels.push({
                name: 'VehicleLog',
                prismaSchema: this.generatePrismaModelSchema('VehicleLog', [
                    { name: 'distance', type: 'Float', description: 'المسافة المقطوعة' },
                    { name: 'fuelCost', type: 'Float', description: 'تكلفة الوقود' },
                    { name: 'date', type: 'DateTime', description: 'التاريخ' }
                ]),
                fields: [
                    { name: 'distance', type: 'Float', description: 'المسافة المقطوعة' },
                    { name: 'fuelCost', type: 'Float', description: 'تكلفة الوقود' },
                    { name: 'date', type: 'DateTime', description: 'التاريخ' }
                ]
            });
        }
        if (/مبيع|عمول|target|هدف|نسبة|commission/.test(policyText)) {
            missingFields.push({ name: 'salesAmount', type: 'Float', description: 'قيمة المبيعات', suggestedModel: 'SalesRecord' }, { name: 'targetAmount', type: 'Float', description: 'الهدف المطلوب', suggestedModel: 'SalesTarget' });
            suggestedModels.push({
                name: 'SalesRecord',
                prismaSchema: this.generatePrismaModelSchema('SalesRecord', [
                    { name: 'amount', type: 'Float', description: 'قيمة المبيعات' },
                    { name: 'date', type: 'DateTime', description: 'التاريخ' },
                    { name: 'productType', type: 'String', description: 'نوع المنتج' }
                ]),
                fields: [
                    { name: 'amount', type: 'Float', description: 'قيمة المبيعات' },
                    { name: 'date', type: 'DateTime', description: 'التاريخ' },
                    { name: 'productType', type: 'String', description: 'نوع المنتج' }
                ]
            });
        }
        if (/تدريب|دورة|شهاد|course|training|certificate/.test(policyText)) {
            missingFields.push({ name: 'courseName', type: 'String', description: 'اسم الدورة', suggestedModel: 'Training' }, { name: 'completionDate', type: 'DateTime', description: 'تاريخ الإكمال', suggestedModel: 'Training' });
            suggestedModels.push({
                name: 'Training',
                prismaSchema: this.generatePrismaModelSchema('Training', [
                    { name: 'courseName', type: 'String', description: 'اسم الدورة' },
                    { name: 'provider', type: 'String', description: 'الجهة المقدمة' },
                    { name: 'completionDate', type: 'DateTime', description: 'تاريخ الإكمال' },
                    { name: 'certificateUrl', type: 'String', description: 'رابط الشهادة' }
                ]),
                fields: [
                    { name: 'courseName', type: 'String', description: 'اسم الدورة' },
                    { name: 'provider', type: 'String', description: 'الجهة المقدمة' },
                    { name: 'completionDate', type: 'DateTime', description: 'تاريخ الإكمال' },
                    { name: 'certificateUrl', type: 'String', description: 'رابط الشهادة' }
                ]
            });
        }
        return {
            missingFields,
            suggestedModels,
            canExecute: suggestedModels.length === 0
        };
    }
    extractSchemaInfo(schemaContent) {
        const modelRegex = /model\s+(\w+)\s+{([^}]+)}/g;
        const models = [];
        let match;
        while ((match = modelRegex.exec(schemaContent)) !== null) {
            const modelName = match[1];
            const modelBody = match[2];
            const fieldRegex = /^\s+(\w+)\s+(String|Int|Float|Boolean|DateTime|Decimal|Json)/gm;
            const fields = [];
            let fieldMatch;
            while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
                fields.push(fieldMatch[1]);
            }
            if (fields.length > 0) {
                const displayFields = fields.slice(0, 50);
                const suffix = fields.length > 50 ? `, ... (+${fields.length - 50} more)` : '';
                models.push(`${modelName}: ${displayFields.join(', ')}${suffix}`);
            }
        }
        return models.slice(0, 30).join('\n');
    }
    generatePrismaModelSchema(modelName, fields) {
        const reservedFields = ['id', 'userid', 'user', 'createdat', 'updatedat'];
        const filteredFields = fields.filter(f => !reservedFields.includes(f.name.toLowerCase()));
        const fieldLines = filteredFields.map(field => {
            const prismaType = this.toPrismaType(field.type);
            return `    ${field.name} ${prismaType} // ${field.description}`;
        }).join('\n');
        return `
model ${modelName} {
    id        String   @id @default(cuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id])
${fieldLines}
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@map("${this.toSnakeCase(modelName)}")
}`;
    }
    async addModelToSchema(model) {
        try {
            let currentSchema = fs.readFileSync(this.schemaPath, 'utf-8');
            if (currentSchema.includes(`model ${model.name} {`)) {
                return { success: false, message: `Model ${model.name} already exists` };
            }
            currentSchema = currentSchema + '\n' + model.prismaSchema;
            const toCamelCase = (str) => str.charAt(0).toLowerCase() + str.slice(1);
            const relationFieldName = toCamelCase(model.name);
            const relationField = `  ${relationFieldName}    ${model.name}[]`;
            const relationExists = currentSchema.includes(`${relationFieldName}    ${model.name}[]`) ||
                currentSchema.includes(`${relationFieldName} ${model.name}[]`);
            if (relationExists) {
                this.logger.log(`⚠️ Relation ${model.name}[] already exists in User model, skipping`);
            }
            else {
                const userModelMatch = currentSchema.match(/model User \{[\s\S]*?@@unique/);
                if (userModelMatch) {
                    const insertPos = currentSchema.indexOf('@@unique', currentSchema.indexOf('model User {'));
                    currentSchema = currentSchema.slice(0, insertPos) + relationField + '\n  ' + currentSchema.slice(insertPos);
                    this.logger.log(`✅ Added ${model.name}[] relation to User model`);
                }
            }
            fs.writeFileSync(this.schemaPath, currentSchema);
            this.logger.log(`✅ Added model ${model.name} to schema.prisma`);
            return { success: true, message: `Model ${model.name} added successfully with User relation` };
        }
        catch (error) {
            this.logger.error(`Failed to add model: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
    async runMigration(migrationName) {
        try {
            const { exec } = require('child_process');
            return new Promise((resolve) => {
                exec(`npx prisma db push`, { cwd: process.cwd() }, (error, stdout, stderr) => {
                    if (error) {
                        this.logger.error(`Migration failed: ${stderr}`);
                        resolve({ success: false, message: stderr });
                    }
                    else {
                        this.logger.log(`✅ Migration successful: ${migrationName}`);
                        resolve({ success: true, message: stdout });
                    }
                });
            });
        }
        catch (error) {
            this.logger.error(`Failed to run migration: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
    async updatePolicyContext(modelName, fields) {
        this.logger.log(`📝 Will update PolicyContextService with fields from ${modelName}: ${fields.join(', ')}`);
    }
    toPrismaType(type) {
        const typeMap = {
            'String': 'String',
            'Int': 'Int',
            'Float': 'Float',
            'Decimal': 'Decimal',
            'DateTime': 'DateTime',
            'Boolean': 'Boolean',
            'Date': 'DateTime',
            'Number': 'Float',
            'string': 'String',
            'number': 'Float',
            'boolean': 'Boolean'
        };
        return typeMap[type] || 'String';
    }
    toSnakeCase(str) {
        return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    }
    async autoExtendSchema(policyText) {
        this.logger.log(`🧠 Auto-extending schema for policy: "${policyText.substring(0, 30)}..."`);
        const analysis = await this.analyzePolicy(policyText);
        if (analysis.canExecute) {
            return {
                analyzed: true,
                modelsAdded: [],
                migrationRun: false,
                message: 'السياسة يمكن تنفيذها بالحقول الحالية'
            };
        }
        const addedModels = [];
        for (const model of analysis.suggestedModels) {
            const result = await this.addModelToSchema(model);
            if (result.success) {
                addedModels.push(model.name);
            }
        }
        if (addedModels.length > 0) {
            const migrationResult = await this.runMigration(`add_${addedModels.join('_')}`);
            return {
                analyzed: true,
                modelsAdded: addedModels,
                migrationRun: migrationResult.success,
                message: `تم إضافة ${addedModels.length} models: ${addedModels.join(', ')}`
            };
        }
        return {
            analyzed: true,
            modelsAdded: [],
            migrationRun: false,
            message: 'لم يتم إضافة أي models جديدة'
        };
    }
};
exports.AiSchemaGeneratorService = AiSchemaGeneratorService;
exports.AiSchemaGeneratorService = AiSchemaGeneratorService = AiSchemaGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], AiSchemaGeneratorService);
//# sourceMappingURL=ai-schema-generator.service.js.map