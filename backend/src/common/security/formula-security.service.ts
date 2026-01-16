import { Injectable, Logger } from '@nestjs/common';

/**
 * 🔒 Formula Security Service
 * خدمة مركزية لأمان تقييم المعادلات
 *
 * المميزات:
 * - اكتشاف التهديدات الشامل
 * - تنقية المدخلات
 * - تحليل تعقيد المعادلات
 * - تسجيل التدقيق
 * - حماية من الحقن
 */

export interface FormulaThreat {
    type: 'INJECTION' | 'PROTOTYPE_POLLUTION' | 'CODE_EXECUTION' | 'RESOURCE_ABUSE' | 'INVALID_CHARS';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    pattern: string;
    position?: number;
}

export interface FormulaSecurityResult {
    isSecure: boolean;
    threats: FormulaThreat[];
    sanitizedFormula?: string;
    complexity: FormulaComplexity;
    auditId: string;
}

export interface FormulaComplexity {
    length: number;
    depth: number;
    operatorCount: number;
    functionCount: number;
    variableCount: number;
    riskScore: number; // 0-100
}

export interface FormulaAuditEntry {
    id: string;
    timestamp: Date;
    formula: string;
    sanitizedFormula?: string;
    isSecure: boolean;
    threats: FormulaThreat[];
    complexity: FormulaComplexity;
    executionContext?: string;
    userId?: string;
    companyId?: string;
    executionTimeMs?: number;
    result?: 'SUCCESS' | 'BLOCKED' | 'ERROR';
    errorMessage?: string;
}

@Injectable()
export class FormulaSecurityService {
    private readonly logger = new Logger(FormulaSecurityService.name);

    // ============== Configuration ==============
    private static readonly MAX_FORMULA_LENGTH = 2000;
    private static readonly MAX_NESTING_DEPTH = 20;
    private static readonly MAX_OPERATORS = 50;
    private static readonly MAX_FUNCTIONS = 20;
    private static readonly MAX_VARIABLES = 30;

    // ============== Threat Patterns ==============

    // Critical: Code execution attempts
    private static readonly CRITICAL_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
        { pattern: /eval\s*\(/i, description: 'Eval function call detected' },
        { pattern: /Function\s*\(/i, description: 'Function constructor detected' },
        { pattern: /new\s+Function/i, description: 'New Function constructor detected' },
        { pattern: /\bexec\s*\(/i, description: 'Exec function call detected' },
        { pattern: /require\s*\(/i, description: 'Require statement detected' },
        { pattern: /import\s*\(/i, description: 'Dynamic import detected' },
        { pattern: /import\s+[{'"]/i, description: 'Import statement detected' },
        { pattern: /module\s*\.\s*exports/i, description: 'Module exports access detected' },
        { pattern: /\bspawn\s*\(/i, description: 'Spawn function detected' },
        { pattern: /child_process/i, description: 'Child process access detected' },
        { pattern: /\bfs\s*\./i, description: 'File system access detected' },
        { pattern: /\bfs\s*\[/i, description: 'File system bracket access detected' },
    ];

    // High: Prototype pollution and object manipulation
    private static readonly HIGH_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
        { pattern: /__proto__/i, description: 'Proto access detected' },
        { pattern: /prototype\s*[.\[]/i, description: 'Prototype access detected' },
        { pattern: /constructor\s*[.\[(]/i, description: 'Constructor access detected' },
        { pattern: /Object\s*\.\s*(?:assign|create|defineProperty|setPrototypeOf)/i, description: 'Object manipulation detected' },
        { pattern: /Reflect\s*\./i, description: 'Reflect API usage detected' },
        { pattern: /Proxy\s*\(/i, description: 'Proxy creation detected' },
        { pattern: /\bwith\s*\(/i, description: 'With statement detected' },
        { pattern: /\[\s*['"`]constructor['"`]\s*\]/i, description: 'Bracket constructor access detected' },
    ];

    // Medium: Global object access and network
    private static readonly MEDIUM_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
        { pattern: /\bwindow\b/i, description: 'Window object access' },
        { pattern: /\bdocument\b/i, description: 'Document object access' },
        { pattern: /\bglobal\b/i, description: 'Global object access' },
        { pattern: /\bglobalThis\b/i, description: 'GlobalThis access' },
        { pattern: /\bprocess\b/i, description: 'Process object access' },
        { pattern: /\bself\b/i, description: 'Self reference' },
        { pattern: /\bthis\b/i, description: 'This keyword usage' },
        { pattern: /setTimeout\s*\(/i, description: 'SetTimeout detected' },
        { pattern: /setInterval\s*\(/i, description: 'SetInterval detected' },
        { pattern: /setImmediate\s*\(/i, description: 'SetImmediate detected' },
        { pattern: /fetch\s*\(/i, description: 'Fetch API detected' },
        { pattern: /XMLHttpRequest/i, description: 'XMLHttpRequest detected' },
        { pattern: /WebSocket/i, description: 'WebSocket detected' },
        { pattern: /\bBuffer\b/i, description: 'Buffer access detected' },
    ];

    // Low: Potentially dangerous but context-dependent
    private static readonly LOW_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
        { pattern: /`.*\$\{/s, description: 'Template literal with interpolation' },
        { pattern: /\\x[0-9a-fA-F]{2}/g, description: 'Hex escape sequence' },
        { pattern: /\\u[0-9a-fA-F]{4}/g, description: 'Unicode escape sequence' },
        { pattern: /\\u\{[0-9a-fA-F]+\}/g, description: 'Extended unicode escape' },
        { pattern: /\[\s*Symbol\./i, description: 'Symbol access' },
        { pattern: /\.\s*bind\s*\(/i, description: 'Bind method usage' },
        { pattern: /\.\s*call\s*\(/i, description: 'Call method usage' },
        { pattern: /\.\s*apply\s*\(/i, description: 'Apply method usage' },
    ];

    // Valid characters for formulas
    private static readonly VALID_CHARS_PATTERN = /^[A-Za-z0-9_+\-*\/().,\s%^<>=!&|?:]+$/;

    // Allowed functions whitelist
    private static readonly ALLOWED_FUNCTIONS = new Set([
        'MIN', 'MAX', 'ABS', 'ROUND', 'FLOOR', 'CEIL', 'SQRT', 'POW', 'LOG',
        'IF', 'SUM', 'COUNT', 'AVG', 'TRUNC',
        'SIN', 'COS', 'TAN', // للحسابات العلمية
    ]);

    // In-memory audit log (in production, use database)
    private auditLog: FormulaAuditEntry[] = [];
    private static readonly MAX_AUDIT_ENTRIES = 10000;

    /**
     * 🔍 تحليل أمان المعادلة
     */
    analyze(formula: string, context?: { userId?: string; companyId?: string }): FormulaSecurityResult {
        const auditId = this.generateAuditId();
        const threats: FormulaThreat[] = [];

        // 1. التحقق من الطول
        if (formula.length > FormulaSecurityService.MAX_FORMULA_LENGTH) {
            threats.push({
                type: 'RESOURCE_ABUSE',
                severity: 'MEDIUM',
                description: `Formula exceeds maximum length (${formula.length}/${FormulaSecurityService.MAX_FORMULA_LENGTH})`,
                pattern: 'LENGTH_EXCEEDED',
            });
        }

        // 2. اكتشاف التهديدات الحرجة
        for (const { pattern, description } of FormulaSecurityService.CRITICAL_PATTERNS) {
            const match = formula.match(pattern);
            if (match) {
                threats.push({
                    type: 'CODE_EXECUTION',
                    severity: 'CRITICAL',
                    description,
                    pattern: pattern.source,
                    position: match.index,
                });
            }
        }

        // 3. اكتشاف تهديدات Prototype Pollution
        for (const { pattern, description } of FormulaSecurityService.HIGH_PATTERNS) {
            const match = formula.match(pattern);
            if (match) {
                threats.push({
                    type: 'PROTOTYPE_POLLUTION',
                    severity: 'HIGH',
                    description,
                    pattern: pattern.source,
                    position: match.index,
                });
            }
        }

        // 4. اكتشاف تهديدات متوسطة
        for (const { pattern, description } of FormulaSecurityService.MEDIUM_PATTERNS) {
            const match = formula.match(pattern);
            if (match) {
                threats.push({
                    type: 'INJECTION',
                    severity: 'MEDIUM',
                    description,
                    pattern: pattern.source,
                    position: match.index,
                });
            }
        }

        // 5. اكتشاف تهديدات منخفضة
        for (const { pattern, description } of FormulaSecurityService.LOW_PATTERNS) {
            const match = formula.match(pattern);
            if (match) {
                threats.push({
                    type: 'INJECTION',
                    severity: 'LOW',
                    description,
                    pattern: pattern.source,
                    position: match.index,
                });
            }
        }

        // 6. التحقق من الأحرف المسموحة
        const upperFormula = formula.toUpperCase();
        if (!FormulaSecurityService.VALID_CHARS_PATTERN.test(upperFormula)) {
            const invalidChars = this.findInvalidChars(upperFormula);
            threats.push({
                type: 'INVALID_CHARS',
                severity: 'HIGH',
                description: `Invalid characters detected: ${invalidChars.join(', ')}`,
                pattern: invalidChars.join(''),
            });
        }

        // 7. تحليل التعقيد
        const complexity = this.analyzeComplexity(formula);

        // 8. التحقق من حدود التعقيد
        if (complexity.depth > FormulaSecurityService.MAX_NESTING_DEPTH) {
            threats.push({
                type: 'RESOURCE_ABUSE',
                severity: 'MEDIUM',
                description: `Nesting depth exceeds limit (${complexity.depth}/${FormulaSecurityService.MAX_NESTING_DEPTH})`,
                pattern: 'DEPTH_EXCEEDED',
            });
        }

        if (complexity.operatorCount > FormulaSecurityService.MAX_OPERATORS) {
            threats.push({
                type: 'RESOURCE_ABUSE',
                severity: 'LOW',
                description: `Operator count exceeds limit (${complexity.operatorCount}/${FormulaSecurityService.MAX_OPERATORS})`,
                pattern: 'OPERATORS_EXCEEDED',
            });
        }

        // 9. تحديد الأمان
        const hasCritical = threats.some(t => t.severity === 'CRITICAL');
        const hasHigh = threats.some(t => t.severity === 'HIGH');
        const isSecure = !hasCritical && !hasHigh;

        // 10. تنقية المعادلة إذا كانت آمنة
        let sanitizedFormula: string | undefined;
        if (isSecure) {
            sanitizedFormula = this.sanitize(formula);
        }

        const result: FormulaSecurityResult = {
            isSecure,
            threats,
            sanitizedFormula,
            complexity,
            auditId,
        };

        // 11. تسجيل التدقيق
        this.logAudit({
            id: auditId,
            timestamp: new Date(),
            formula,
            sanitizedFormula,
            isSecure,
            threats,
            complexity,
            userId: context?.userId,
            companyId: context?.companyId,
            result: isSecure ? 'SUCCESS' : 'BLOCKED',
        });

        if (!isSecure) {
            this.logger.warn(
                `[SECURITY] Formula blocked - AuditId: ${auditId}, ` +
                `Threats: ${threats.filter(t => t.severity === 'CRITICAL' || t.severity === 'HIGH').length} critical/high`
            );
        }

        return result;
    }

    /**
     * 🧹 تنقية المعادلة
     */
    sanitize(formula: string): string {
        if (!formula) return '';

        let sanitized = formula
            // إزالة المسافات الزائدة
            .replace(/\s+/g, ' ')
            .trim()
            // تحويل للأحرف الكبيرة للتوحيد
            .toUpperCase()
            // إزالة التعليقات
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // إزالة الأحرف غير المرئية
            .replace(/[\x00-\x1F\x7F]/g, '')
            // تحويل الفاصلة العربية للإنجليزية
            .replace(/،/g, ',')
            // تحويل الأرقام العربية
            .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

        return sanitized;
    }

    /**
     * 📊 تحليل تعقيد المعادلة
     */
    analyzeComplexity(formula: string): FormulaComplexity {
        const length = formula.length;

        // حساب عمق التداخل
        let depth = 0;
        let maxDepth = 0;
        for (const char of formula) {
            if (char === '(') {
                depth++;
                maxDepth = Math.max(maxDepth, depth);
            } else if (char === ')') {
                depth--;
            }
        }

        // حساب عدد العمليات
        const operatorMatches = formula.match(/[+\-*\/%^<>=!&|]/g) || [];
        const operatorCount = operatorMatches.length;

        // حساب عدد الدوال
        const functionMatches = formula.match(/[A-Z_][A-Z0-9_]*\s*\(/gi) || [];
        const functionCount = functionMatches.length;

        // حساب عدد المتغيرات
        const variableMatches = formula.match(/\b[A-Z_][A-Z0-9_]*\b/gi) || [];
        const uniqueVars = new Set(variableMatches.map(v => v.toUpperCase()));
        // استثناء الدوال المعروفة
        FormulaSecurityService.ALLOWED_FUNCTIONS.forEach(f => uniqueVars.delete(f));
        const variableCount = uniqueVars.size;

        // حساب نقاط الخطر
        const riskScore = Math.min(100,
            (length / FormulaSecurityService.MAX_FORMULA_LENGTH) * 20 +
            (maxDepth / FormulaSecurityService.MAX_NESTING_DEPTH) * 30 +
            (operatorCount / FormulaSecurityService.MAX_OPERATORS) * 25 +
            (functionCount / FormulaSecurityService.MAX_FUNCTIONS) * 15 +
            (variableCount / FormulaSecurityService.MAX_VARIABLES) * 10
        );

        return {
            length,
            depth: maxDepth,
            operatorCount,
            functionCount,
            variableCount,
            riskScore: Math.round(riskScore),
        };
    }

    /**
     * ✅ التحقق السريع من الأمان
     */
    isSecure(formula: string): boolean {
        if (!formula || typeof formula !== 'string') return false;
        if (formula.length > FormulaSecurityService.MAX_FORMULA_LENGTH) return false;

        // فحص سريع للأنماط الحرجة فقط
        for (const { pattern } of FormulaSecurityService.CRITICAL_PATTERNS) {
            if (pattern.test(formula)) return false;
        }

        for (const { pattern } of FormulaSecurityService.HIGH_PATTERNS) {
            if (pattern.test(formula)) return false;
        }

        return FormulaSecurityService.VALID_CHARS_PATTERN.test(formula.toUpperCase());
    }

    /**
     * 🔐 التحقق من الدالة المسموحة
     */
    isAllowedFunction(funcName: string): boolean {
        return FormulaSecurityService.ALLOWED_FUNCTIONS.has(funcName.toUpperCase());
    }

    /**
     * 📋 الحصول على قائمة الدوال المسموحة
     */
    getAllowedFunctions(): string[] {
        return Array.from(FormulaSecurityService.ALLOWED_FUNCTIONS);
    }

    /**
     * 📝 تسجيل نتيجة التنفيذ
     */
    logExecutionResult(
        auditId: string,
        result: 'SUCCESS' | 'ERROR',
        executionTimeMs: number,
        errorMessage?: string
    ): void {
        const entry = this.auditLog.find(e => e.id === auditId);
        if (entry) {
            entry.result = result;
            entry.executionTimeMs = executionTimeMs;
            entry.errorMessage = errorMessage;
        }
    }

    /**
     * 📊 الحصول على سجل التدقيق
     */
    getAuditLog(options?: {
        limit?: number;
        companyId?: string;
        onlyBlocked?: boolean;
        startDate?: Date;
        endDate?: Date;
    }): FormulaAuditEntry[] {
        let entries = [...this.auditLog];

        if (options?.companyId) {
            entries = entries.filter(e => e.companyId === options.companyId);
        }

        if (options?.onlyBlocked) {
            entries = entries.filter(e => e.result === 'BLOCKED');
        }

        if (options?.startDate) {
            entries = entries.filter(e => e.timestamp >= options.startDate!);
        }

        if (options?.endDate) {
            entries = entries.filter(e => e.timestamp <= options.endDate!);
        }

        // ترتيب بالأحدث أولاً
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        if (options?.limit) {
            entries = entries.slice(0, options.limit);
        }

        return entries;
    }

    /**
     * 📈 الحصول على إحصائيات الأمان
     */
    getSecurityStats(companyId?: string): {
        totalAnalyzed: number;
        blocked: number;
        passed: number;
        criticalThreats: number;
        highThreats: number;
        averageComplexity: number;
    } {
        let entries = companyId
            ? this.auditLog.filter(e => e.companyId === companyId)
            : this.auditLog;

        const totalAnalyzed = entries.length;
        const blocked = entries.filter(e => e.result === 'BLOCKED').length;
        const passed = entries.filter(e => e.result === 'SUCCESS').length;

        const criticalThreats = entries.reduce(
            (sum, e) => sum + e.threats.filter(t => t.severity === 'CRITICAL').length,
            0
        );

        const highThreats = entries.reduce(
            (sum, e) => sum + e.threats.filter(t => t.severity === 'HIGH').length,
            0
        );

        const averageComplexity = entries.length > 0
            ? entries.reduce((sum, e) => sum + e.complexity.riskScore, 0) / entries.length
            : 0;

        return {
            totalAnalyzed,
            blocked,
            passed,
            criticalThreats,
            highThreats,
            averageComplexity: Math.round(averageComplexity),
        };
    }

    // ============== Private Methods ==============

    private findInvalidChars(formula: string): string[] {
        const invalid: string[] = [];
        for (const char of formula) {
            if (!/[A-Za-z0-9_+\-*\/().,\s%^<>=!&|?:]/.test(char)) {
                if (!invalid.includes(char)) {
                    invalid.push(char);
                }
            }
        }
        return invalid;
    }

    private generateAuditId(): string {
        return `FA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private logAudit(entry: FormulaAuditEntry): void {
        this.auditLog.push(entry);

        // الحفاظ على حد السجلات
        if (this.auditLog.length > FormulaSecurityService.MAX_AUDIT_ENTRIES) {
            this.auditLog = this.auditLog.slice(-FormulaSecurityService.MAX_AUDIT_ENTRIES);
        }
    }
}
