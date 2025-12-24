import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface ImportRow {
    employee_code?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    national_id?: string;
    iqama_number?: string;
    gosi_number?: string;
    date_of_birth?: string;
    gender?: string;
    nationality?: string;
    is_saudi?: string;
    passport_number?: string;
    passport_expiry?: string;
    iqama_expiry?: string;
    hire_date?: string;
    salary?: string;
    branch_code?: string;
    department_code?: string;
    job_title?: string;
    role?: string;
    marital_status?: string;
    password?: string;
}

interface ImportResult {
    success: boolean;
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; field: string; message: string }[];
}

@Injectable()
export class EmployeeImportService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get import template headers
     */
    getTemplateHeaders(): string[] {
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

    /**
     * Generate CSV template
     */
    generateTemplate(): string {
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

    /**
     * Parse CSV content
     */
    parseCSV(content: string): ImportRow[] {
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
            throw new BadRequestException('الملف فارغ أو لا يحتوي على بيانات');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        const rows: ImportRow[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0) continue;

            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.trim().replace(/^["']|["']$/g, '') || '';
            });
            rows.push(row);
        }

        return rows;
    }

    /**
     * Parse a single CSV line handling quoted values
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);

        return result;
    }

    /**
     * Import employees from parsed data (Upsert mode)
     */
    async importEmployees(rows: ImportRow[], companyId: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            totalRows: rows.length,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
        };

        // Pre-fetch branches and departments for code lookup
        const branches = await this.prisma.branch.findMany({ where: { companyId } });
        const departments = await this.prisma.department.findMany({
            where: { branch: { companyId } },
        });

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // +2 because of header and 0-index

            try {
                // Validate required fields
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

                // Check if user exists by email or nationalId
                let existingUser = await this.prisma.user.findFirst({
                    where: {
                        companyId,
                        OR: [
                            { email: row.email },
                            ...(row.national_id ? [{ nationalId: row.national_id }] : []),
                        ],
                    },
                });

                // Prepare user data
                // Use name for lookup since Branch/Department don't have a code field
                const branchId = row.branch_code
                    ? branches.find(b => b.name === row.branch_code || b.nameEn === row.branch_code)?.id
                    : undefined;
                const departmentId = row.department_code
                    ? departments.find(d => d.name === row.department_code || d.nameEn === row.department_code)?.id
                    : undefined;

                const userData: any = {
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
                    // Update existing user
                    await this.prisma.user.update({
                        where: { id: existingUser.id },
                        data: userData,
                    });
                    result.updated++;
                } else {
                    // Create new user
                    const password = row.password || 'Temp@123'; // Default password
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
            } catch (error: any) {
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

    private parseRole(role?: string): string {
        if (!role) return 'EMPLOYEE';
        const upper = role.toUpperCase();
        if (['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(upper)) {
            return upper;
        }
        return 'EMPLOYEE';
    }

    /**
     * Validate import data before processing
     */
    async validateImport(rows: ImportRow[], companyId: string): Promise<{
        valid: boolean;
        warnings: { row: number; message: string }[];
        errors: { row: number; field: string; message: string }[];
    }> {
        const warnings: { row: number; message: string }[] = [];
        const errors: { row: number; field: string; message: string }[] = [];

        // Check for existing emails
        const emails = rows.map(r => r.email).filter(Boolean);
        const existingEmails = await this.prisma.user.findMany({
            where: { email: { in: emails }, companyId },
            select: { email: true },
        });
        const existingEmailSet = new Set(existingEmails.map(u => u.email));

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            // Required fields
            if (!row.first_name) {
                errors.push({ row: rowNum, field: 'first_name', message: 'الاسم الأول مطلوب' });
            }
            if (!row.last_name) {
                errors.push({ row: rowNum, field: 'last_name', message: 'الاسم الأخير مطلوب' });
            }
            if (!row.email) {
                errors.push({ row: rowNum, field: 'email', message: 'البريد الإلكتروني مطلوب' });
            }

            // Email format
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                errors.push({ row: rowNum, field: 'email', message: 'صيغة البريد الإلكتروني غير صحيحة' });
            }

            // Warn about existing users
            if (row.email && existingEmailSet.has(row.email)) {
                warnings.push({ row: rowNum, message: `سيتم تحديث بيانات الموظف: ${row.email}` });
            }

            // Date format validation
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
}
