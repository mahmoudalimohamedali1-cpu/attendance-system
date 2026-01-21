import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConnectOdooDto, TestOdooConnectionDto } from './dto/connect-odoo.dto';
import { SyncEmployeesDto, EmployeeImportResultDto, OdooEmployeeDto } from './dto/odoo-employee.dto';
import { SyncAttendanceDto, AttendanceSyncResultDto, PushAttendanceDto } from './dto/sync-attendance.dto';
import * as https from 'https';
import * as http from 'http';

interface OdooXmlRpcResponse {
    success: boolean;
    data?: any;
    error?: string;
    uid?: number;
}

interface OdooConfig {
    id: string;
    odooUrl: string;
    database: string;
    username: string;
    apiKey: string;
    uid?: number;
}

@Injectable()
export class OdooService {
    private readonly logger = new Logger(OdooService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ============= CONNECTION =============

    /**
     * Test connection to Odoo instance
     */
    async testConnection(dto: TestOdooConnectionDto): Promise<{ success: boolean; message: string; uid?: number }> {
        try {
            const result = await this.authenticate(dto.odooUrl, dto.database, dto.username, dto.apiKey);

            if (result.success && result.uid) {
                return {
                    success: true,
                    message: 'تم الاتصال بـ Odoo بنجاح',
                    uid: result.uid,
                };
            }

            return {
                success: false,
                message: result.error || 'فشل الاتصال بـ Odoo',
            };
        } catch (error) {
            this.logger.error('Odoo connection test failed:', error);
            return {
                success: false,
                message: `خطأ في الاتصال: ${error.message}`,
            };
        }
    }

    /**
     * Connect and save Odoo configuration
     */
    async connect(companyId: string, userId: string, dto: ConnectOdooDto): Promise<{ success: boolean; message: string }> {
        // Test connection first
        const testResult = await this.testConnection({
            odooUrl: dto.odooUrl,
            database: dto.database,
            username: dto.username,
            apiKey: dto.apiKey,
        });

        if (!testResult.success) {
            throw new BadRequestException(testResult.message);
        }

        // Save or update configuration
        await this.prisma.integration.upsert({
            where: {
                companyId_type: {
                    companyId,
                    type: 'ODOO',
                },
            },
            create: {
                companyId,
                type: 'ODOO',
                name: 'Odoo ERP',
                isActive: true,
                createdById: userId,
                connectedAt: new Date(),
                config: {
                    odooUrl: dto.odooUrl,
                    database: dto.database,
                    username: dto.username,
                    apiKey: dto.apiKey, // Should be encrypted in production
                    syncInterval: dto.syncInterval || 5,
                    autoSync: dto.autoSync ?? true,
                    uid: testResult.uid,
                },
            },
            update: {
                isActive: true,
                createdById: userId,
                connectedAt: new Date(),
                config: {
                    odooUrl: dto.odooUrl,
                    database: dto.database,
                    username: dto.username,
                    apiKey: dto.apiKey,
                    syncInterval: dto.syncInterval || 5,
                    autoSync: dto.autoSync ?? true,
                    uid: testResult.uid,
                },
            },
        });

        this.logger.log(`Odoo connected for company ${companyId}`);
        return { success: true, message: 'تم ربط Odoo بنجاح' };
    }

    /**
     * Disconnect Odoo integration
     */
    async disconnect(companyId: string): Promise<{ success: boolean; message: string }> {
        await this.prisma.integration.deleteMany({
            where: { companyId, type: 'ODOO' },
        });

        // Clear employee mappings
        await this.prisma.$executeRaw`DELETE FROM odoo_employee_mappings WHERE company_id = ${companyId}`;

        return { success: true, message: 'تم فصل Odoo' };
    }

    /**
     * Get Odoo configuration for a company
     */
    async getConfig(companyId: string): Promise<OdooConfig | null> {
        const integration = await this.prisma.integration.findFirst({
            where: { companyId, type: 'ODOO', isActive: true },
        });

        if (!integration || !integration.config) {
            return null;
        }

        const config = integration.config as any;
        return {
            id: integration.id,
            odooUrl: config.odooUrl,
            database: config.database,
            username: config.username,
            apiKey: config.apiKey,
            uid: config.uid,
        };
    }

    /**
     * Get connection status
     */
    async getStatus(companyId: string): Promise<{
        isConnected: boolean;
        lastSyncAt?: Date;
        config?: { odooUrl: string; database: string; syncInterval: number };
    }> {
        const integration = await this.prisma.integration.findFirst({
            where: { companyId, type: 'ODOO', isActive: true },
        });

        if (!integration) {
            return { isConnected: false };
        }

        const config = integration.config as any;
        return {
            isConnected: true,
            lastSyncAt: integration.lastSyncAt || undefined,
            config: {
                odooUrl: config.odooUrl,
                database: config.database,
                syncInterval: config.syncInterval || 5,
            },
        };
    }

    // ============= EMPLOYEES =============

    /**
     * Fetch employees from Odoo
     */
    async fetchEmployees(companyId: string, dto?: SyncEmployeesDto): Promise<OdooEmployeeDto[]> {
        const config = await this.getConfig(companyId);
        if (!config) {
            throw new NotFoundException('Odoo غير متصل');
        }

        const domain: any[] = [];
        if (dto?.activeOnly !== false) {
            domain.push(['active', '=', true]);
        }
        if (dto?.departmentId) {
            domain.push(['department_id', '=', dto.departmentId]);
        }

        const result = await this.callOdoo(config, 'hr.employee', 'search_read', [
            domain,
            ['id', 'name', 'work_email', 'mobile_phone', 'work_phone', 'department_id', 'job_id', 'parent_id', 'employee_type', 'active'],
        ]);

        if (!result.success || !Array.isArray(result.data)) {
            throw new BadRequestException(result.error || 'فشل جلب الموظفين من Odoo');
        }

        return result.data.map((emp: any) => ({
            id: emp.id,
            name: emp.name,
            workEmail: emp.work_email || undefined,
            mobilePhone: emp.mobile_phone || undefined,
            workPhone: emp.work_phone || undefined,
            departmentId: emp.department_id?.[0] || undefined,
            departmentName: emp.department_id?.[1] || undefined,
            jobId: emp.job_id?.[0] || undefined,
            jobTitle: emp.job_id?.[1] || undefined,
            managerId: emp.parent_id?.[0] || undefined,
            managerName: emp.parent_id?.[1] || undefined,
            employeeType: emp.employee_type || undefined,
            active: emp.active,
        }));
    }

    /**
     * Sync employees from Odoo to local system
     */
    async syncEmployees(companyId: string, dto?: SyncEmployeesDto): Promise<EmployeeImportResultDto> {
        const employees = await this.fetchEmployees(companyId, dto);
        const result: EmployeeImportResultDto = {
            total: employees.length,
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: [],
        };

        for (const emp of employees) {
            try {
                // Check if mapping exists
                const existingMapping = await this.prisma.$queryRaw<any[]>`
          SELECT user_id FROM odoo_employee_mappings 
          WHERE odoo_employee_id = ${emp.id} AND company_id = ${companyId}
        `;

                if (existingMapping.length > 0) {
                    // Update existing user - parse name into firstName/lastName
                    const nameParts = emp.name.split(' ');
                    const firstName = nameParts[0] || emp.name;
                    const lastName = nameParts.slice(1).join(' ') || firstName;

                    await this.prisma.user.update({
                        where: { id: existingMapping[0].user_id },
                        data: {
                            firstName,
                            lastName,
                            phone: emp.mobilePhone || emp.workPhone || undefined,
                            jobTitle: emp.jobTitle,
                        },
                    });
                    result.updated++;;
                } else if (dto?.createNewUsers && emp.workEmail) {
                    // Create new user - parse name into firstName/lastName
                    const nameParts = emp.name.split(' ');
                    const firstName = nameParts[0] || emp.name;
                    const lastName = nameParts.slice(1).join(' ') || firstName;

                    const newUser = await this.prisma.user.create({
                        data: {
                            email: emp.workEmail,
                            password: '', // Will need to be set by user
                            firstName,
                            lastName,
                            phone: emp.mobilePhone || emp.workPhone || undefined,
                            jobTitle: emp.jobTitle,
                            companyId,
                            role: 'EMPLOYEE',
                            status: 'ACTIVE',
                        },
                    });

                    // Create mapping
                    await this.prisma.$executeRaw`
            INSERT INTO odoo_employee_mappings (id, user_id, odoo_employee_id, company_id, last_sync_at)
            VALUES (gen_random_uuid(), ${newUser.id}, ${emp.id}, ${companyId}, NOW())
          `;
                    result.imported++;
                } else {
                    result.skipped++;
                }
            } catch (error) {
                result.errors.push({ odooId: emp.id, error: error.message });
            }
        }

        // Update last sync time
        await this.prisma.integration.updateMany({
            where: { companyId, type: 'ODOO' },
            data: { lastSyncAt: new Date() },
        });

        this.logger.log(`Synced ${result.imported + result.updated} employees from Odoo for company ${companyId}`);
        return result;
    }

    /**
     * Map local user to Odoo employee
     */
    async mapEmployee(companyId: string, userId: string, odooEmployeeId: number): Promise<{ success: boolean }> {
        await this.prisma.$executeRaw`
      INSERT INTO odoo_employee_mappings (id, user_id, odoo_employee_id, company_id, last_sync_at)
      VALUES (gen_random_uuid(), ${userId}, ${odooEmployeeId}, ${companyId}, NOW())
      ON CONFLICT (user_id, company_id) DO UPDATE SET odoo_employee_id = ${odooEmployeeId}, last_sync_at = NOW()
    `;
        return { success: true };
    }

    /**
     * Unmap local user from Odoo employee
     */
    async unmapEmployee(companyId: string, userId: string): Promise<{ success: boolean }> {
        await this.prisma.$executeRaw`
      DELETE FROM odoo_employee_mappings WHERE user_id = ${userId} AND company_id = ${companyId}
    `;
        return { success: true };
    }

    /**
     * Get all employee mappings with local user info
     */
    async getEmployeeMappings(companyId: string): Promise<any[]> {
        // Get all local users
        const users = await this.prisma.user.findMany({
            where: { companyId, role: { in: ['EMPLOYEE', 'MANAGER'] as any } },
            select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
        });

        // Get mappings
        const mappings = await this.prisma.$queryRaw<any[]>`
            SELECT user_id, odoo_employee_id FROM odoo_employee_mappings WHERE company_id = ${companyId}
        `;
        const mappingMap = new Map(mappings.map(m => [m.user_id, m.odoo_employee_id]));

        // Fetch Odoo employees for mapping display
        let odooEmployees: any[] = [];
        try {
            odooEmployees = await this.fetchEmployees(companyId);
        } catch (e) {
            // If Odoo not connected, just return local users without Odoo info
        }
        const odooMap = new Map(odooEmployees.map(e => [e.id, e]));

        return users.map(user => ({
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            jobTitle: user.jobTitle,
            isMapped: mappingMap.has(user.id),
            odooEmployeeId: mappingMap.get(user.id) || null,
            odooEmployeeName: mappingMap.has(user.id) ? odooMap.get(mappingMap.get(user.id))?.name || null : null,
        }));
    }

    // ============= ATTENDANCE =============

    /**
     * Push attendance record to Odoo
     */
    async pushAttendance(companyId: string, attendance: PushAttendanceDto): Promise<{ success: boolean; odooId?: number }> {
        const config = await this.getConfig(companyId);
        if (!config) {
            throw new NotFoundException('Odoo غير متصل');
        }

        const result = await this.callOdoo(config, 'hr.attendance', 'create', [{
            employee_id: attendance.odooEmployeeId,
            check_in: attendance.checkIn,
            check_out: attendance.checkOut || false,
        }]);

        if (!result.success) {
            throw new BadRequestException(result.error || 'فشل إرسال الحضور لـ Odoo');
        }

        return { success: true, odooId: result.data };
    }

    /**
     * Sync attendance records to Odoo
     */
    async syncAttendance(companyId: string, dto?: SyncAttendanceDto): Promise<AttendanceSyncResultDto> {
        const config = await this.getConfig(companyId);
        if (!config) {
            throw new NotFoundException('Odoo غير متصل');
        }

        // Get attendance records that haven't been synced
        const startDate = dto?.startDate ? new Date(dto.startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
        const endDate = dto?.endDate ? new Date(dto.endDate) : new Date();

        // Get mappings
        const mappings = await this.prisma.$queryRaw<any[]>`
      SELECT user_id, odoo_employee_id FROM odoo_employee_mappings WHERE company_id = ${companyId}
    `;

        if (mappings.length === 0) {
            return { total: 0, pushed: 0, failed: 0, errors: [{ attendanceId: '', error: 'لا يوجد موظفين مربوطين بـ Odoo' }] };
        }

        const userToOdoo = new Map(mappings.map(m => [m.user_id, m.odoo_employee_id]));

        // Get attendance records using raw query to handle optional odoo fields
        const userIds = Array.from(userToOdoo.keys());
        const attendances = await this.prisma.attendance.findMany({
            where: {
                userId: { in: userIds },
                checkInTime: { gte: startDate, lte: endDate },
            },
            take: 100, // Batch limit
        });

        const result: AttendanceSyncResultDto = {
            total: attendances.length,
            pushed: 0,
            failed: 0,
            errors: [],
        };

        for (const att of attendances) {
            const odooEmployeeId = userToOdoo.get(att.userId);
            if (!odooEmployeeId || !att.checkInTime) continue;

            try {
                await this.pushAttendance(companyId, {
                    odooEmployeeId,
                    checkIn: att.checkInTime.toISOString(),
                    checkOut: att.checkOutTime?.toISOString(),
                });

                // Log sync success (no odooSynced field yet, using metadata in future)
                this.logger.debug(`Synced attendance ${att.id} to Odoo`);

                result.pushed++;
            } catch (error) {
                result.failed++;
                result.errors.push({ attendanceId: att.id, error: error.message });
            }
        }

        this.logger.log(`Pushed ${result.pushed} attendance records to Odoo for company ${companyId}`);
        return result;
    }

    // ============= LEAVES =============

    /**
     * Fetch leave types from Odoo
     */
    async fetchLeaveTypes(companyId: string): Promise<any[]> {
        const config = await this.getConfig(companyId);
        if (!config) {
            throw new NotFoundException('Odoo غير متصل');
        }

        const result = await this.callOdoo(config, 'hr.leave.type', 'search_read', [
            [],
            ['id', 'name', 'code', 'request_unit', 'validity_start', 'validity_stop'],
        ]);

        if (!result.success || !Array.isArray(result.data)) {
            throw new BadRequestException(result.error || 'فشل جلب أنواع الإجازات من Odoo');
        }

        return result.data.map((lt: any) => ({
            id: lt.id,
            name: lt.name,
            code: lt.code,
            requestUnit: lt.request_unit,
            validityStart: lt.validity_start,
            validityStop: lt.validity_stop,
        }));
    }

    /**
     * Push leave request to Odoo
     */
    async pushLeave(companyId: string, data: {
        odooEmployeeId: number;
        leaveTypeId: number;
        dateFrom: string;
        dateTo: string;
        notes?: string;
    }): Promise<{ success: boolean; odooId?: number }> {
        const config = await this.getConfig(companyId);
        if (!config) {
            throw new NotFoundException('Odoo غير متصل');
        }

        const result = await this.callOdoo(config, 'hr.leave', 'create', [{
            employee_id: data.odooEmployeeId,
            holiday_status_id: data.leaveTypeId,
            date_from: data.dateFrom,
            date_to: data.dateTo,
            name: data.notes || 'طلب إجازة من نظام الحضور',
            request_date_from: data.dateFrom,
            request_date_to: data.dateTo,
        }]);

        if (!result.success) {
            throw new BadRequestException(result.error || 'فشل إرسال الإجازة لـ Odoo');
        }

        return { success: true, odooId: result.data };
    }

    /**
     * Fetch leaves from Odoo
     */
    async fetchLeaves(companyId: string, options?: {
        startDate?: string;
        endDate?: string;
        state?: string;
    }): Promise<any[]> {
        const config = await this.getConfig(companyId);
        if (!config) {
            throw new NotFoundException('Odoo غير متصل');
        }

        const domain: any[] = [];
        if (options?.startDate) {
            domain.push(['date_from', '>=', options.startDate]);
        }
        if (options?.endDate) {
            domain.push(['date_to', '<=', options.endDate]);
        }
        if (options?.state) {
            domain.push(['state', '=', options.state]);
        }

        const result = await this.callOdoo(config, 'hr.leave', 'search_read', [
            domain,
            ['id', 'employee_id', 'holiday_status_id', 'date_from', 'date_to', 'number_of_days', 'state', 'name'],
        ]);

        if (!result.success || !Array.isArray(result.data)) {
            throw new BadRequestException(result.error || 'فشل جلب الإجازات من Odoo');
        }

        return result.data.map((leave: any) => ({
            id: leave.id,
            employeeId: leave.employee_id?.[0],
            employeeName: leave.employee_id?.[1],
            leaveTypeId: leave.holiday_status_id?.[0],
            leaveTypeName: leave.holiday_status_id?.[1],
            dateFrom: leave.date_from,
            dateTo: leave.date_to,
            numberOfDays: leave.number_of_days,
            state: leave.state,
            notes: leave.name,
        }));
    }

    // ============= PAYROLL =============

    /**
     * Generate payroll data for Odoo export
     */
    async generatePayrollExport(companyId: string, periodStart: Date, periodEnd: Date, userIds?: string[]): Promise<any> {
        // Get employee mappings
        const mappings = await this.prisma.$queryRaw<any[]>`
            SELECT user_id, odoo_employee_id FROM odoo_employee_mappings WHERE company_id = ${companyId}
        `;

        if (mappings.length === 0) {
            return { totalEmployees: 0, data: [], errors: [{ userId: '', error: 'لا يوجد موظفين مربوطين بـ Odoo' }] };
        }

        const userToOdoo = new Map(mappings.map(m => [m.user_id, m.odoo_employee_id]));
        const targetUserIds = userIds || Array.from(userToOdoo.keys());

        const results: any[] = [];
        const errors: any[] = [];

        for (const userId of targetUserIds) {
            const odooEmployeeId = userToOdoo.get(userId);
            if (!odooEmployeeId) {
                errors.push({ userId, error: 'الموظف غير مربوط بـ Odoo' });
                continue;
            }

            try {
                // Get user info
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { id: true, firstName: true, lastName: true },
                });

                if (!user) continue;

                // Get attendance summary
                const attendances = await this.prisma.attendance.findMany({
                    where: {
                        userId,
                        date: { gte: periodStart, lte: periodEnd },
                    },
                    select: {
                        workingMinutes: true,
                        overtimeMinutes: true,
                        lateMinutes: true,
                        earlyLeaveMinutes: true,
                        status: true,
                    },
                });

                const workedDays = attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
                const absentDays = attendances.filter(a => a.status === 'ABSENT').length;
                const workedMinutes = attendances.reduce((sum, a) => sum + (a.workingMinutes || 0), 0);
                const overtimeMinutes = attendances.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0);
                const lateMinutes = attendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
                const earlyLeaveMinutes = attendances.reduce((sum, a) => sum + (a.earlyLeaveMinutes || 0), 0);

                results.push({
                    odooEmployeeId,
                    userId,
                    employeeName: `${user.firstName} ${user.lastName}`,
                    workedDays,
                    workedHours: Math.round(workedMinutes / 60 * 100) / 100,
                    overtimeHours: Math.round(overtimeMinutes / 60 * 100) / 100,
                    lateMinutes,
                    earlyLeaveMinutes,
                    absentDays,
                });
            } catch (error) {
                errors.push({ userId, error: error.message });
            }
        }

        return {
            periodStart: periodStart.toISOString().split('T')[0],
            periodEnd: periodEnd.toISOString().split('T')[0],
            totalEmployees: results.length,
            exported: results.length,
            failed: errors.length,
            data: results,
            errors,
        };
    }

    /**
     * Push payroll data to Odoo work entries
     */
    async pushPayrollToOdoo(companyId: string, data: any[]): Promise<{ success: number; failed: number; errors: any[] }> {
        const config = await this.getConfig(companyId);
        if (!config) {
            throw new NotFoundException('Odoo غير متصل');
        }

        let success = 0;
        let failed = 0;
        const errors: any[] = [];

        for (const entry of data) {
            try {
                // Create work entry in Odoo
                await this.callOdoo(config, 'hr.work.entry', 'create', [{
                    employee_id: entry.odooEmployeeId,
                    work_entry_type_id: 1, // Default work entry type
                    name: `حضور ${entry.employeeName}`,
                    date_start: entry.periodStart,
                    date_stop: entry.periodEnd,
                    duration: entry.workedHours,
                }]);
                success++;
            } catch (error) {
                failed++;
                errors.push({ odooEmployeeId: entry.odooEmployeeId, error: error.message });
            }
        }

        return { success, failed, errors };
    }

    // ============= API HELPERS =============

    /**
     * Authenticate with Odoo
     */
    private async authenticate(odooUrl: string, database: string, username: string, password: string): Promise<OdooXmlRpcResponse> {
        try {
            const payload = this.buildXmlRpcPayload('authenticate', [database, username, password, {}]);
            const response = await this.httpRequest(odooUrl, '/xmlrpc/2/common', payload);

            const uid = this.parseXmlRpcResponse(response);

            if (typeof uid === 'number' && uid > 0) {
                return { success: true, uid, data: uid };
            }

            return { success: false, error: 'بيانات الدخول غير صحيحة' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Call Odoo model method
     */
    private async callOdoo(config: OdooConfig, model: string, method: string, args: any[]): Promise<OdooXmlRpcResponse> {
        try {
            // Re-authenticate if no uid
            let uid = config.uid;
            if (!uid) {
                const authResult = await this.authenticate(config.odooUrl, config.database, config.username, config.apiKey);
                if (!authResult.success || !authResult.uid) {
                    return { success: false, error: 'فشل المصادقة مع Odoo' };
                }
                uid = authResult.uid;
            }

            const payload = this.buildXmlRpcPayload('execute_kw', [
                config.database,
                uid,
                config.apiKey,
                model,
                method,
                args,
            ]);

            const response = await this.httpRequest(config.odooUrl, '/xmlrpc/2/object', payload);
            const data = this.parseXmlRpcResponse(response);

            return { success: true, data };
        } catch (error) {
            this.logger.error(`Odoo API call failed: ${model}.${method}`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Build XML-RPC payload
     */
    private buildXmlRpcPayload(method: string, params: any[]): string {
        const paramXml = params.map(p => this.toXmlValue(p)).join('');
        return `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>${paramXml}</params>
</methodCall>`;
    }

    /**
     * Convert value to XML-RPC format
     */
    private toXmlValue(value: any): string {
        if (value === null || value === undefined) {
            return '<param><value><boolean>0</boolean></value></param>';
        }
        if (typeof value === 'boolean') {
            return `<param><value><boolean>${value ? 1 : 0}</boolean></value></param>`;
        }
        if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                return `<param><value><int>${value}</int></value></param>`;
            }
            return `<param><value><double>${value}</double></value></param>`;
        }
        if (typeof value === 'string') {
            return `<param><value><string>${this.escapeXml(value)}</string></value></param>`;
        }
        if (Array.isArray(value)) {
            const items = value.map(v => `<value>${this.toXmlInner(v)}</value>`).join('');
            return `<param><value><array><data>${items}</data></array></value></param>`;
        }
        if (typeof value === 'object') {
            const members = Object.entries(value).map(([k, v]) =>
                `<member><name>${k}</name><value>${this.toXmlInner(v)}</value></member>`
            ).join('');
            return `<param><value><struct>${members}</struct></value></param>`;
        }
        return `<param><value><string>${String(value)}</string></value></param>`;
    }

    private toXmlInner(value: any): string {
        if (value === null || value === undefined || value === false) {
            return '<boolean>0</boolean>';
        }
        if (typeof value === 'boolean') {
            return `<boolean>${value ? 1 : 0}</boolean>`;
        }
        if (typeof value === 'number') {
            return Number.isInteger(value) ? `<int>${value}</int>` : `<double>${value}</double>`;
        }
        if (typeof value === 'string') {
            return `<string>${this.escapeXml(value)}</string>`;
        }
        if (Array.isArray(value)) {
            const items = value.map(v => `<value>${this.toXmlInner(v)}</value>`).join('');
            return `<array><data>${items}</data></array>`;
        }
        if (typeof value === 'object') {
            const members = Object.entries(value).map(([k, v]) =>
                `<member><name>${k}</name><value>${this.toXmlInner(v)}</value></member>`
            ).join('');
            return `<struct>${members}</struct>`;
        }
        return `<string>${String(value)}</string>`;
    }

    private escapeXml(str: string): string {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /**
     * Parse XML-RPC response - improved recursive parser
     */
    private parseXmlRpcResponse(xml: string): any {
        // Extract the first value from methodResponse/params/param/value
        let content = xml;

        // If this is a full response, extract the value
        const paramMatch = xml.match(/<param>\s*<value>([\s\S]*?)<\/value>\s*<\/param>/);
        if (paramMatch) {
            content = paramMatch[1];
        } else {
            const valueMatch = xml.match(/<value[^>]*>([\s\S]*?)<\/value>/);
            if (valueMatch) {
                content = valueMatch[1];
            }
        }

        return this.parseXmlValue(content.trim());
    }

    /**
     * Parse a single XML-RPC value
     */
    private parseXmlValue(content: string): any {
        if (!content) return null;

        // Integer
        const intMatch = content.match(/^<i(?:nt|4)>(-?\d+)<\/i(?:nt|4)>$/);
        if (intMatch) return parseInt(intMatch[1], 10);

        // Double
        const doubleMatch = content.match(/^<double>([^<]+)<\/double>$/);
        if (doubleMatch) return parseFloat(doubleMatch[1]);

        // Boolean
        const boolMatch = content.match(/^<boolean>([01])<\/boolean>$/);
        if (boolMatch) return boolMatch[1] === '1';

        // String
        const strMatch = content.match(/^<string>([^<]*)<\/string>$/);
        if (strMatch) return strMatch[1];

        // Empty string or direct string content
        if (content.match(/^<string\s*\/>$/)) return '';

        // Array - need to parse recursively
        if (content.startsWith('<array>')) {
            const dataMatch = content.match(/<array>\s*<data>([\s\S]*)<\/data>\s*<\/array>/);
            if (dataMatch) {
                return this.parseArrayData(dataMatch[1]);
            }
            return [];
        }

        // Struct - need to parse recursively
        if (content.startsWith('<struct>')) {
            const structContent = content.match(/<struct>([\s\S]*)<\/struct>/);
            if (structContent) {
                return this.parseStructMembers(structContent[1]);
            }
            return {};
        }

        // Fault
        if (content.includes('<fault>')) {
            const faultMatch = content.match(/<string>([^<]+)<\/string>/);
            throw new Error(faultMatch ? faultMatch[1] : 'XML-RPC Fault');
        }

        // Plain text or unknown
        return content.trim();
    }

    /**
     * Parse array data - handles nested values properly
     */
    private parseArrayData(dataContent: string): any[] {
        const values: any[] = [];
        let depth = 0;
        let currentValue = '';
        let inValue = false;
        let i = 0;

        while (i < dataContent.length) {
            if (dataContent.substring(i, i + 7) === '<value>') {
                if (depth === 0) {
                    inValue = true;
                    currentValue = '';
                } else {
                    currentValue += '<value>';
                }
                depth++;
                i += 7;
            } else if (dataContent.substring(i, i + 8) === '</value>') {
                depth--;
                if (depth === 0 && inValue) {
                    values.push(this.parseXmlValue(currentValue.trim()));
                    inValue = false;
                } else {
                    currentValue += '</value>';
                }
                i += 8;
            } else {
                if (inValue) {
                    currentValue += dataContent[i];
                }
                i++;
            }
        }

        return values;
    }

    /**
     * Parse struct members - handles nested values properly
     */
    private parseStructMembers(structContent: string): Record<string, any> {
        const obj: Record<string, any> = {};
        const memberRegex = /<member>\s*<name>([^<]+)<\/name>\s*<value>([\s\S]*?)<\/value>\s*<\/member>/g;
        let match;

        // For simple structs, use regex
        while ((match = memberRegex.exec(structContent)) !== null) {
            const name = match[1];
            const valueContent = match[2].trim();
            obj[name] = this.parseXmlValue(valueContent);
        }

        return obj;
    }

    /**
     * Make HTTP request
     */
    private httpRequest(baseUrl: string, path: string, body: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const url = new URL(path, baseUrl);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml',
                    'Content-Length': Buffer.byteLength(body),
                },
                timeout: 30000,
            };

            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(body);
            req.end();
        });
    }
}
