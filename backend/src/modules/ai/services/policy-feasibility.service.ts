import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { SchemaIntrospectorService } from "./schema-introspector.service";
import { ParsedPolicyRule } from "./policy-parser.service";

export interface FieldAvailability {
    field: string;
    source: string;
    dataType: string;
    exists: boolean;
    hasData: boolean;
    sampleValue?: any;
}

export interface MissingField {
    field: string;
    reason: string;
    suggestion: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface FeasibilitySummary {
    totalConditions: number;
    satisfiedConditions: number;
    missingConditions: number;
    executionReadiness: "READY" | "PARTIAL" | "NOT_READY";
    confidenceScore: number; // 0-100
}

export interface PolicyFeasibilityResult {
    isExecutable: boolean;
    availableFields: FieldAvailability[];
    missingFields: MissingField[];
    summary: FeasibilitySummary;
    recommendations: string[];
    warnings: string[];
}

@Injectable()
export class PolicyFeasibilityService {
    private readonly logger = new Logger(PolicyFeasibilityService.name);

    // خريطة الحقول المدعومة مع مصادرها
    private readonly fieldMappings: Record<string, { model: string; field: string; description: string }> = {
        // بيانات الموظف
        "employee.tenure.months": { model: "User", field: "createdAt", description: "أشهر الخدمة محسوبة من تاريخ التعيين" },
        "employee.tenure.years": { model: "User", field: "createdAt", description: "سنوات الخدمة محسوبة من تاريخ التعيين" },
        "employee.department": { model: "User", field: "departmentId", description: "القسم" },
        "employee.branch": { model: "User", field: "branchId", description: "الفرع" },
        "employee.jobTitle": { model: "User", field: "jobTitle", description: "المسمى الوظيفي" },
        "employee.isSaudi": { model: "User", field: "nationality", description: "هل الموظف سعودي" },

        // بيانات العقد
        "contract.isProbation": { model: "Contract", field: "isProbation", description: "فترة تجربة" },
        "contract.basicSalary": { model: "Contract", field: "basicSalary", description: "الراتب الأساسي" },
        "contract.totalSalary": { model: "Contract", field: "totalSalary", description: "إجمالي الراتب" },

        // بيانات الحضور
        "attendance.currentPeriod.presentDays": { model: "Attendance", field: "status", description: "أيام الحضور" },
        "attendance.currentPeriod.absentDays": { model: "Attendance", field: "status", description: "أيام الغياب" },
        "attendance.currentPeriod.lateDays": { model: "Attendance", field: "lateMinutes", description: "أيام التأخير" },
        "attendance.currentPeriod.lateMinutes": { model: "Attendance", field: "lateMinutes", description: "دقائق التأخير" },
        "attendance.currentPeriod.overtimeHours": { model: "Attendance", field: "overtimeMinutes", description: "ساعات العمل الإضافي" },
        "attendance.currentPeriod.attendancePercentage": { model: "Attendance", field: "status", description: "نسبة الحضور" },

        // بيانات الإجازات
        "leaves.currentMonth.sickDays": { model: "LeaveRequest", field: "leaveType", description: "أيام الإجازة المرضية" },
        "leaves.currentMonth.annualDays": { model: "LeaveRequest", field: "leaveType", description: "أيام الإجازة السنوية" },
        "leaves.balance.annual": { model: "LeaveBalance", field: "balance", description: "رصيد الإجازات السنوية" },

        // بيانات العهد
        "custody.active": { model: "CustodyAssignment", field: "status", description: "عدد العهد النشطة" },
        "custody.avgReturnDelay": { model: "CustodyReturn", field: "returnDate", description: "متوسط تأخير إرجاع العهد" },
        "custody.damagedCount": { model: "CustodyReturn", field: "conditionOnReturn", description: "عدد العهد التالفة" },
        "custody.totalDamagedValue": { model: "CustodyReturn", field: "replacementValue", description: "إجمالي قيمة العهد التالفة" },

        // بيانات التأديب
        "disciplinary.activeWarnings": { model: "DisciplinaryCase", field: "status", description: "الإنذارات النشطة" },
        "disciplinary.activeCases": { model: "DisciplinaryCase", field: "status", description: "القضايا التأديبية النشطة" },

        // بيانات القسم
        "department.departmentAttendance": { model: "Attendance", field: "status", description: "نسبة حضور القسم" },

        // بيانات الأداء
        "performance.targetAchievement": { model: "PerformanceReview", field: "rating", description: "نسبة تحقيق الهدف" },
        "performance.lastRating": { model: "PerformanceReview", field: "rating", description: "آخر تقييم أداء" },
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly schemaIntrospector: SchemaIntrospectorService,
    ) { }

    /**
     * تحليل جاهزية السياسة للتنفيذ
     */
    async analyzeFeasibility(parsedPolicy: ParsedPolicyRule, companyId: string): Promise<PolicyFeasibilityResult> {
        this.logger.log("Analyzing policy feasibility...");

        const availableFields: FieldAvailability[] = [];
        const missingFields: MissingField[] = [];
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // 1. تحليل الشروط
        if (parsedPolicy.conditions && parsedPolicy.conditions.length > 0) {
            for (const condition of parsedPolicy.conditions) {
                const fieldAnalysis = await this.analyzeField(condition.field, companyId);

                if (fieldAnalysis.exists) {
                    availableFields.push(fieldAnalysis);
                } else {
                    missingFields.push({
                        field: condition.field,
                        reason: fieldAnalysis.reason || "الحقل غير موجود في النظام",
                        suggestion: fieldAnalysis.suggestion || "أضف هذا الحقل في الـ Schema",
                        priority: "HIGH",
                    });
                }
            }
        }

        // 2. تحليل الإجراءات
        for (const action of parsedPolicy.actions) {
            if (action.valueType === "FORMULA" && action.value) {
                const formulaFields = this.extractFieldsFromFormula(String(action.value));
                for (const field of formulaFields) {
                    const fieldAnalysis = await this.analyzeField(field, companyId);
                    if (!fieldAnalysis.exists && !availableFields.find(f => f.field === field)) {
                        missingFields.push({
                            field,
                            reason: "مستخدم في المعادلة ولكنه غير موجود",
                            suggestion: fieldAnalysis.suggestion || "أضف هذا الحقل للمعادلة تشتغل",
                            priority: "HIGH",
                        });
                    }
                }
            }
        }

        // 3. تحليل الاستعلام الديناميكي
        if (parsedPolicy.dynamicQuery) {
            const tableExists = this.schemaIntrospector.findField(parsedPolicy.dynamicQuery.table + ".id");
            if (!tableExists.found) {
                missingFields.push({
                    field: parsedPolicy.dynamicQuery.table,
                    reason: "الجدول المطلوب للاستعلام غير موجود",
                    suggestion: "أنشئ جدول " + parsedPolicy.dynamicQuery.table,
                    priority: "HIGH",
                });
            }

            for (const where of parsedPolicy.dynamicQuery.where || []) {
                const fullField = parsedPolicy.dynamicQuery.table + "." + where.field;
                const fieldCheck = this.schemaIntrospector.findField(fullField);
                if (!fieldCheck.found) {
                    missingFields.push({
                        field: fullField,
                        reason: "حقل الاستعلام غير موجود",
                        suggestion: "أضف حقل " + where.field + " في جدول " + parsedPolicy.dynamicQuery.table,
                        priority: "HIGH",
                    });
                }
            }
        }

        // 4. إنشاء التوصيات
        if (missingFields.length > 0) {
            recommendations.push("🔧 يجب إضافة " + missingFields.length + " حقول ناقصة قبل تفعيل السياسة");

            const groupedByModel = this.groupMissingFieldsByModel(missingFields);
            for (const [model, fields] of Object.entries(groupedByModel)) {
                recommendations.push("   📌 " + model + ": " + fields.join(", "));
            }
        }

        if (parsedPolicy.clarificationNeeded) {
            warnings.push("⚠️ السياسة تحتاج توضيح: " + parsedPolicy.clarificationNeeded);
        }

        // 5. حساب الملخص
        const totalConditions = (parsedPolicy.conditions?.length || 0) +
            (parsedPolicy.dynamicQuery?.where?.length || 0);
        const satisfiedConditions = availableFields.length;
        const missingConditions = missingFields.length;

        let executionReadiness: "READY" | "PARTIAL" | "NOT_READY" = "NOT_READY";
        let confidenceScore = 0;

        if (missingConditions === 0 && satisfiedConditions > 0) {
            executionReadiness = "READY";
            confidenceScore = 100;
        } else if (missingConditions > 0 && satisfiedConditions > 0) {
            executionReadiness = "PARTIAL";
            confidenceScore = Math.round((satisfiedConditions / totalConditions) * 100);
        } else if (totalConditions === 0) {
            // سياسة بدون شروط (تنطبق على الكل)
            executionReadiness = "READY";
            confidenceScore = 90;
            warnings.push("⚠️ هذه السياسة ليس لها شروط وستنطبق على جميع الموظفين");
        }

        const result: PolicyFeasibilityResult = {
            isExecutable: executionReadiness === "READY",
            availableFields,
            missingFields,
            summary: {
                totalConditions,
                satisfiedConditions,
                missingConditions,
                executionReadiness,
                confidenceScore,
            },
            recommendations,
            warnings,
        };

        this.logger.log("Feasibility analysis complete: " + executionReadiness + " (" + confidenceScore + "%)");
        return result;
    }

    /**
     * تحليل حقل معين
     */
    private async analyzeField(fieldPath: string, companyId: string): Promise<FieldAvailability & { reason?: string; suggestion?: string }> {
        // التحقق من الحقول المعروفة
        const mapping = this.fieldMappings[fieldPath];

        if (mapping) {
            // الحقل معروف ومدعوم
            const schemaCheck = this.schemaIntrospector.findField(mapping.model + "." + mapping.field);

            if (schemaCheck.found) {
                // التحقق من وجود بيانات
                const hasData = await this.checkDataExists(mapping.model, companyId);

                return {
                    field: fieldPath,
                    source: mapping.model + "." + mapping.field,
                    dataType: schemaCheck.field?.type || "unknown",
                    exists: true,
                    hasData,
                };
            }
        }

        // البحث في الـ Schema مباشرة
        const directCheck = this.schemaIntrospector.findField(fieldPath);
        if (directCheck.found) {
            return {
                field: fieldPath,
                source: directCheck.model?.name + "." + directCheck.field?.name,
                dataType: directCheck.field?.type || "unknown",
                exists: true,
                hasData: true, // افتراضي
            };
        }

        // الحقل غير موجود - اقتراح بدائل
        const suggestions = this.schemaIntrospector.suggestSimilarFields(fieldPath);

        return {
            field: fieldPath,
            source: "",
            dataType: "unknown",
            exists: false,
            hasData: false,
            reason: "الحقل غير موجود في قاعدة البيانات",
            suggestion: suggestions.length > 0
                ? "هل تقصد: " + suggestions.join(" أو ")
                : "أضف هذا الحقل في الـ Prisma Schema",
        };
    }

    /**
     * التحقق من وجود بيانات في جدول
     */
    private async checkDataExists(modelName: string, companyId: string): Promise<boolean> {
        try {
            const modelLower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
            const prismaModel = (this.prisma as any)[modelLower];

            if (!prismaModel) return false;

            const count = await prismaModel.count({
                where: { companyId },
                take: 1,
            });

            return count > 0;
        } catch {
            return false;
        }
    }

    /**
     * استخراج الحقول من معادلة
     */
    private extractFieldsFromFormula(formula: string): string[] {
        const fieldPattern = /([a-z]+(?:\.[a-z]+)+)/gi;
        const matches = formula.match(fieldPattern) || [];
        return [...new Set(matches)];
    }

    /**
     * تجميع الحقول الناقصة حسب الـ Model
     */
    private groupMissingFieldsByModel(missingFields: MissingField[]): Record<string, string[]> {
        const grouped: Record<string, string[]> = {};

        for (const field of missingFields) {
            const parts = field.field.split(".");
            const model = parts[0];
            const fieldName = parts.slice(1).join(".");

            if (!grouped[model]) grouped[model] = [];
            grouped[model].push(fieldName);
        }

        return grouped;
    }

    /**
     * الحصول على قائمة الحقول المدعومة
     */
    getSupportedFields(): string[] {
        return Object.keys(this.fieldMappings);
    }

    /**
     * الحصول على وصف حقل
     */
    getFieldDescription(fieldPath: string): string | undefined {
        return this.fieldMappings[fieldPath]?.description;
    }
}
