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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeImportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../common/prisma/prisma.service");
const column_mapper_service_1 = require("./column-mapper.service");
const bcrypt = require("bcryptjs");
let EmployeeImportService = class EmployeeImportService {
    constructor(prisma, columnMapper) {
        this.prisma = prisma;
        this.columnMapper = columnMapper;
    }
    getTemplateHeaders() {
        return [
            'employee_code',
            'first_name',
            'last_name',
            'email',
            'phone',
            'national_id',
            'iqama_number',
            'gosi_number',
            'date_of_birth',
            'gender',
            'nationality',
            'is_saudi',
            'passport_number',
            'passport_expiry',
            'iqama_expiry',
            'hire_date',
            'salary',
            'branch_code',
            'department_code',
            'job_title',
            'role',
            'marital_status',
            'password',
        ];
    }
    generateTemplate() {
        const headers = this.getTemplateHeaders();
        const sampleRow = [
            'EMP001',
            'أحمد',
            'محمد',
            'ahmed@company.com',
            '0501234567',
            '1234567890',
            '',
            '123456789',
            '1990-05-15',
            'MALE',
            'سعودي',
            'true',
            '',
            '',
            '',
            '2024-01-01',
            '10000',
            '',
            '',
            'موظف',
            'EMPLOYEE',
            'MARRIED',
            'Password123',
        ];
        return [headers.join(','), sampleRow.join(',')].join('\n');
    }
    parseCSV(content) {
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
            throw new common_1.BadRequestException('الملف فارغ أو لا يحتوي على بيانات');
        }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0)
                continue;
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.trim().replace(/^["']|["']$/g, '') || '';
            });
            rows.push(row);
        }
        return rows;
    }
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }
    async importEmployees(rows, companyId) {
        const result = {
            success: false,
            totalRows: rows.length,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
        };
        const branches = await this.prisma.branch.findMany({ where: { companyId } });
        const departments = await this.prisma.department.findMany({
            where: { branch: { companyId } },
        });
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            try {
                if (!row.first_name) {
                    result.errors.push({ row: rowNum, field: 'first_name', message: 'الاسم الأول مطلوب' });
                    result.skipped++;
                    continue;
                }
                if (!row.last_name) {
                    result.errors.push({ row: rowNum, field: 'last_name', message: 'الاسم الأخير مطلوب' });
                    result.skipped++;
                    continue;
                }
                if (!row.email) {
                    result.errors.push({ row: rowNum, field: 'email', message: 'البريد الإلكتروني مطلوب' });
                    result.skipped++;
                    continue;
                }
                let existingUser = await this.prisma.user.findFirst({
                    where: {
                        companyId,
                        OR: [
                            { email: row.email },
                            ...(row.national_id ? [{ nationalId: row.national_id }] : []),
                        ],
                    },
                });
                const branchId = row.branch_code
                    ? branches.find(b => b.name === row.branch_code || b.nameEn === row.branch_code)?.id
                    : undefined;
                const departmentId = row.department_code
                    ? departments.find(d => d.name === row.department_code || d.nameEn === row.department_code)?.id
                    : undefined;
                const userData = {
                    firstName: row.first_name,
                    lastName: row.last_name,
                    email: row.email,
                    phone: row.phone || null,
                    employeeCode: row.employee_code || null,
                    nationalId: row.national_id || null,
                    iqamaNumber: row.iqama_number || null,
                    gosiNumber: row.gosi_number || null,
                    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth) : null,
                    gender: row.gender?.toUpperCase() || null,
                    nationality: row.nationality || null,
                    isSaudi: row.is_saudi?.toLowerCase() === 'true',
                    passportNumber: row.passport_number || null,
                    passportExpiryDate: row.passport_expiry ? new Date(row.passport_expiry) : null,
                    iqamaExpiryDate: row.iqama_expiry ? new Date(row.iqama_expiry) : null,
                    hireDate: row.hire_date ? new Date(row.hire_date) : null,
                    salary: row.salary ? parseFloat(row.salary) : null,
                    jobTitle: row.job_title || null,
                    role: this.parseRole(row.role),
                    maritalStatus: row.marital_status?.toUpperCase() || null,
                    status: 'ACTIVE',
                    branchId: branchId || null,
                    departmentId: departmentId || null,
                    companyId,
                };
                if (existingUser) {
                    await this.prisma.user.update({
                        where: { id: existingUser.id },
                        data: userData,
                    });
                    result.updated++;
                }
                else {
                    const password = row.password || 'Temp@123';
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await this.prisma.user.create({
                        data: {
                            ...userData,
                            password: hashedPassword,
                            annualLeaveDays: 21,
                            remainingLeaveDays: 21,
                        },
                    });
                    result.created++;
                }
            }
            catch (error) {
                result.errors.push({
                    row: rowNum,
                    field: 'general',
                    message: error.message || 'خطأ غير معروف',
                });
                result.skipped++;
            }
        }
        result.success = result.errors.length === 0;
        return result;
    }
    parseRole(role) {
        if (!role)
            return 'EMPLOYEE';
        const upper = role.toUpperCase();
        if (['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(upper)) {
            return upper;
        }
        return 'EMPLOYEE';
    }
    async validateImport(rows, companyId) {
        const warnings = [];
        const errors = [];
        const emails = rows.map(r => r.email).filter(Boolean);
        const existingEmails = await this.prisma.user.findMany({
            where: { email: { in: emails }, companyId },
            select: { email: true },
        });
        const existingEmailSet = new Set(existingEmails.map(u => u.email));
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            if (!row.first_name) {
                errors.push({ row: rowNum, field: 'first_name', message: 'الاسم الأول مطلوب' });
            }
            if (!row.last_name) {
                errors.push({ row: rowNum, field: 'last_name', message: 'الاسم الأخير مطلوب' });
            }
            if (!row.email) {
                errors.push({ row: rowNum, field: 'email', message: 'البريد الإلكتروني مطلوب' });
            }
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                errors.push({ row: rowNum, field: 'email', message: 'صيغة البريد الإلكتروني غير صحيحة' });
            }
            if (row.email && existingEmailSet.has(row.email)) {
                warnings.push({ row: rowNum, message: `سيتم تحديث بيانات الموظف: ${row.email}` });
            }
            if (row.date_of_birth && isNaN(Date.parse(row.date_of_birth))) {
                errors.push({ row: rowNum, field: 'date_of_birth', message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
            }
            if (row.hire_date && isNaN(Date.parse(row.hire_date))) {
                errors.push({ row: rowNum, field: 'hire_date', message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
            }
        }
        return {
            valid: errors.length === 0,
            warnings,
            errors,
        };
    }
    smartAnalyzeCSV(content) {
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 1) {
            throw new common_1.BadRequestException('الملف فارغ');
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/['\"]/g, ''));
        const mappings = this.columnMapper.analyzeColumns(headers);
        const preview = [];
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.trim().replace(/^['\"]/g, '').replace(/['\""]$/g, '') || '';
            });
            preview.push(row);
        }
        return { headers, mappings, preview };
    }
    async smartImportEmployees(content, companyId, customMappings) {
        const result = {
            success: false,
            totalRows: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            customFieldsAdded: 0,
        };
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
            throw new common_1.BadRequestException('الملف فارغ أو لا يحتوي على بيانات');
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/['\"]/g, ''));
        result.totalRows = lines.length - 1;
        const branches = await this.prisma.branch.findMany({ where: { companyId } });
        const departments = await this.prisma.department.findMany({
            where: { branch: { companyId } },
        });
        const knownFields = this.getTemplateHeaders();
        const customFields = [];
        for (const [source, target] of Object.entries(customMappings)) {
            if (target === null || !knownFields.includes(target)) {
                customFields.push(source);
            }
        }
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const rowNum = i + 1;
            if (values.length === 0)
                continue;
            try {
                const row = {};
                const customData = {};
                headers.forEach((header, index) => {
                    const value = values[index]?.trim().replace(/^['\"]/g, '').replace(/['\""]$/g, '') || '';
                    const targetField = customMappings[header];
                    if (targetField && knownFields.includes(targetField)) {
                        row[targetField] = value;
                    }
                    else {
                        customData[header] = value;
                    }
                });
                if (!row.first_name && !row.email) {
                    result.errors.push({ row: rowNum, field: 'first_name/email', message: 'يجب توفير الاسم الأول أو البريد الإلكتروني' });
                    result.skipped++;
                    continue;
                }
                let existingUser = await this.prisma.user.findFirst({
                    where: {
                        companyId,
                        OR: [
                            ...(row.email ? [{ email: row.email }] : []),
                            ...(row.national_id ? [{ nationalId: row.national_id }] : []),
                        ],
                    },
                });
                const branchId = row.branch_code
                    ? branches.find(b => b.name === row.branch_code || b.nameEn === row.branch_code)?.id
                    : undefined;
                const departmentId = row.department_code
                    ? departments.find(d => d.name === row.department_code || d.nameEn === row.department_code)?.id
                    : undefined;
                const userData = {
                    firstName: row.first_name || 'غير محدد',
                    lastName: row.last_name || '',
                    email: row.email || `temp_${Date.now()}_${rowNum}@temp.com`,
                    phone: row.phone || null,
                    employeeCode: row.employee_code || null,
                    nationalId: row.national_id || null,
                    iqamaNumber: row.iqama_number || null,
                    gosiNumber: row.gosi_number || null,
                    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth) : null,
                    gender: row.gender?.toUpperCase() || null,
                    nationality: row.nationality || null,
                    isSaudi: row.is_saudi?.toLowerCase() === 'true',
                    passportNumber: row.passport_number || null,
                    passportExpiryDate: row.passport_expiry ? new Date(row.passport_expiry) : null,
                    iqamaExpiryDate: row.iqama_expiry ? new Date(row.iqama_expiry) : null,
                    hireDate: row.hire_date ? new Date(row.hire_date) : null,
                    salary: row.salary ? parseFloat(row.salary) : null,
                    jobTitle: row.job_title || null,
                    role: this.parseRole(row.role),
                    maritalStatus: row.marital_status?.toUpperCase() || null,
                    status: 'ACTIVE',
                    branchId: branchId || null,
                    departmentId: departmentId || null,
                    companyId,
                };
                let userId;
                if (existingUser) {
                    await this.prisma.user.update({
                        where: { id: existingUser.id },
                        data: userData,
                    });
                    userId = existingUser.id;
                    result.updated++;
                }
                else {
                    const password = row.password || 'Temp@123';
                    const hashedPassword = await bcrypt.hash(password, 10);
                    const newUser = await this.prisma.user.create({
                        data: {
                            ...userData,
                            password: hashedPassword,
                            annualLeaveDays: 21,
                            remainingLeaveDays: 21,
                        },
                    });
                    userId = newUser.id;
                    result.created++;
                }
                const customFieldsCount = await this.saveCustomFields(userId, customData, headers);
                result.customFieldsAdded += customFieldsCount;
            }
            catch (error) {
                result.errors.push({
                    row: rowNum,
                    field: 'general',
                    message: error.message || 'خطأ غير معروف',
                });
                result.skipped++;
            }
        }
        result.success = result.errors.length === 0;
        return result;
    }
    async saveCustomFields(userId, customData, sourceHeaders) {
        let count = 0;
        for (const [fieldName, fieldValue] of Object.entries(customData)) {
            if (!fieldValue)
                continue;
            let fieldType = 'text';
            if (!isNaN(Number(fieldValue))) {
                fieldType = 'number';
            }
            else if (!isNaN(Date.parse(fieldValue))) {
                fieldType = 'date';
            }
            await this.prisma.userCustomField.upsert({
                where: {
                    userId_fieldName: {
                        userId,
                        fieldName,
                    },
                },
                update: {
                    fieldValue,
                    fieldType,
                    sourceHeader: fieldName,
                },
                create: {
                    userId,
                    fieldName,
                    fieldValue,
                    fieldType,
                    sourceHeader: fieldName,
                },
            });
            count++;
        }
        return count;
    }
    async getUserCustomFields(userId) {
        return this.prisma.userCustomField.findMany({
            where: { userId },
            select: {
                fieldName: true,
                fieldValue: true,
                fieldType: true,
            },
        });
    }
};
exports.EmployeeImportService = EmployeeImportService;
exports.EmployeeImportService = EmployeeImportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        column_mapper_service_1.ColumnMapperService])
], EmployeeImportService);
//# sourceMappingURL=employee-import.service.js.map