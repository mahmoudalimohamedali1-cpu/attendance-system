import { ExtendedReportsService } from '../services/extended-reports.service';
import { ExtendedReportQueryDto, AttendanceDetailedQueryDto, LateReportQueryDto, OvertimeReportQueryDto, PayrollReportQueryDto, LeaveReportQueryDto, EmployeeReportQueryDto, ContractExpiryQueryDto, CustodyReportQueryDto } from '../dto/extended-report.dto';
export declare class ExtendedReportsController {
    private readonly service;
    constructor(service: ExtendedReportsService);
    getCatalog(): import("../dto/extended-report.dto").ReportDefinition[];
    getDailyAttendance(req: any, query: AttendanceDetailedQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: AttendanceDetailedQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
                jobTitle: string | null;
                branch: {
                    name: string;
                } | null;
                department: {
                    name: string;
                } | null;
            };
            branch: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            companyId: string | null;
            branchId: string;
            notes: string | null;
            lateMinutes: number;
            date: Date;
            checkInTime: Date | null;
            checkOutTime: Date | null;
            checkInLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInDistance: number | null;
            checkOutLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutDistance: number | null;
            earlyLeaveMinutes: number;
            workingMinutes: number;
            overtimeMinutes: number;
            isWorkFromHome: boolean;
            isMockLocation: boolean;
            deviceInfo: string | null;
            checkInFaceVerified: boolean;
            checkInFaceConfidence: number | null;
            checkOutFaceVerified: boolean;
            checkOutFaceConfidence: number | null;
            userId: string;
        })[];
        summary: {
            present: number;
            late: number;
            absent: number;
            onLeave: number;
            workFromHome: number;
            totalLateMinutes: any;
            totalOvertimeMinutes: any;
        };
    }>;
    getLateDetails(req: any, query: LateReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: LateReportQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
                department: {
                    name: string;
                } | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            companyId: string | null;
            branchId: string;
            notes: string | null;
            lateMinutes: number;
            date: Date;
            checkInTime: Date | null;
            checkOutTime: Date | null;
            checkInLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInDistance: number | null;
            checkOutLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutDistance: number | null;
            earlyLeaveMinutes: number;
            workingMinutes: number;
            overtimeMinutes: number;
            isWorkFromHome: boolean;
            isMockLocation: boolean;
            deviceInfo: string | null;
            checkInFaceVerified: boolean;
            checkInFaceConfidence: number | null;
            checkOutFaceVerified: boolean;
            checkOutFaceConfidence: number | null;
            userId: string;
        })[];
        summary: {
            totalRecords: number;
            totalLateMinutes: any;
            byEmployee: any[];
        };
    }>;
    getAbsence(req: any, query: ExtendedReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: ExtendedReportQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
                branch: {
                    name: string;
                } | null;
                department: {
                    name: string;
                } | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            companyId: string | null;
            branchId: string;
            notes: string | null;
            lateMinutes: number;
            date: Date;
            checkInTime: Date | null;
            checkOutTime: Date | null;
            checkInLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInDistance: number | null;
            checkOutLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutDistance: number | null;
            earlyLeaveMinutes: number;
            workingMinutes: number;
            overtimeMinutes: number;
            isWorkFromHome: boolean;
            isMockLocation: boolean;
            deviceInfo: string | null;
            checkInFaceVerified: boolean;
            checkInFaceConfidence: number | null;
            checkOutFaceVerified: boolean;
            checkOutFaceConfidence: number | null;
            userId: string;
        })[];
        summary: {
            totalAbsences: number;
        };
    }>;
    getEarlyLeave(req: any, query: ExtendedReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: ExtendedReportQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            companyId: string | null;
            branchId: string;
            notes: string | null;
            lateMinutes: number;
            date: Date;
            checkInTime: Date | null;
            checkOutTime: Date | null;
            checkInLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInDistance: number | null;
            checkOutLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutDistance: number | null;
            earlyLeaveMinutes: number;
            workingMinutes: number;
            overtimeMinutes: number;
            isWorkFromHome: boolean;
            isMockLocation: boolean;
            deviceInfo: string | null;
            checkInFaceVerified: boolean;
            checkInFaceConfidence: number | null;
            checkOutFaceVerified: boolean;
            checkOutFaceConfidence: number | null;
            userId: string;
        })[];
        summary: {
            totalEarlyLeaves: number;
            totalMinutes: any;
        };
    }>;
    getOvertime(req: any, query: OvertimeReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: OvertimeReportQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
                salary: import("@prisma/client/runtime/library").Decimal | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            companyId: string | null;
            branchId: string;
            notes: string | null;
            lateMinutes: number;
            date: Date;
            checkInTime: Date | null;
            checkOutTime: Date | null;
            checkInLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInDistance: number | null;
            checkOutLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutDistance: number | null;
            earlyLeaveMinutes: number;
            workingMinutes: number;
            overtimeMinutes: number;
            isWorkFromHome: boolean;
            isMockLocation: boolean;
            deviceInfo: string | null;
            checkInFaceVerified: boolean;
            checkInFaceConfidence: number | null;
            checkOutFaceVerified: boolean;
            checkOutFaceConfidence: number | null;
            userId: string;
        })[];
        summary: {
            totalOvertimeMinutes: any;
            totalOvertimeHours: number;
        };
    }>;
    getWorkFromHome(req: any, query: ExtendedReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: ExtendedReportQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            companyId: string | null;
            branchId: string;
            notes: string | null;
            lateMinutes: number;
            date: Date;
            checkInTime: Date | null;
            checkOutTime: Date | null;
            checkInLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkInDistance: number | null;
            checkOutLatitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutLongitude: import("@prisma/client/runtime/library").Decimal | null;
            checkOutDistance: number | null;
            earlyLeaveMinutes: number;
            workingMinutes: number;
            overtimeMinutes: number;
            isWorkFromHome: boolean;
            isMockLocation: boolean;
            deviceInfo: string | null;
            checkInFaceVerified: boolean;
            checkInFaceConfidence: number | null;
            checkOutFaceVerified: boolean;
            checkOutFaceConfidence: number | null;
            userId: string;
        })[];
        summary: {
            totalDays: number;
        };
    }>;
    getByBranch(req: any, query: ExtendedReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: ExtendedReportQueryDto;
            totalCount: number;
        };
        data: {
            branchId: string;
            branchName: string;
            employeeCount: number;
            totalAttendances: number;
            present: number;
            late: number;
            absent: number;
            totalLateMinutes: any;
            avgAttendanceRate: number;
        }[];
    }>;
    getByDepartment(req: any, query: ExtendedReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: ExtendedReportQueryDto;
            totalCount: number;
        };
        data: {
            departmentId: string;
            departmentName: string;
            employeeCount: number;
            totalAttendances: number;
            present: number;
            late: number;
            absent: number;
        }[];
    }>;
    getCompliance(req: any, query: ExtendedReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: ExtendedReportQueryDto;
            totalCount: number;
        };
        data: {
            userId: string;
            employeeName: string;
            employeeCode: string | null;
            department: string | undefined;
            branch: string | undefined;
            totalDays: number;
            presentDays: number;
            onTimeDays: number;
            lateDays: number;
            absentDays: number;
            complianceRate: number;
            attendanceRate: number;
        }[];
        summary: {
            avgComplianceRate: number;
        };
    }>;
    getSuspicious(req: any, query: ExtendedReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: ExtendedReportQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            companyId: string | null;
            notes: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            deviceInfo: string | null;
            userId: string;
            ipAddress: string | null;
            attemptType: string;
            distance: number | null;
        })[];
        summary: {
            total: number;
            byType: Record<string, number>;
        };
    }>;
    getPayrollSummary(req: any, query: PayrollReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: PayrollReportQueryDto;
            totalCount: number;
        };
        data: never[];
        summary: {};
    } | {
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: {
                year: number;
                month: number;
            };
            totalCount: any;
        };
        data: any;
        summary: {
            totalBasic: any;
            totalGross: any;
            totalDeductions: any;
            totalNet: any;
            employeeCount: any;
        };
    }>;
    getGosi(req: any, query: PayrollReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: PayrollReportQueryDto;
            totalCount: number;
        };
        data: never[];
        summary: {
            totalEmployeeShare?: undefined;
            totalEmployerShare?: undefined;
            grandTotal?: undefined;
        };
    } | {
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: {
                year: number;
                month: number;
            };
            totalCount: any;
        };
        data: any;
        summary: {
            totalEmployeeShare: any;
            totalEmployerShare: any;
            grandTotal: any;
        };
    }>;
    getAdvances(req: any, query: ExtendedReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: ExtendedReportQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: {
            amount: number;
            approvedAmount: number | null;
            paidAmount: number;
            remaining: number;
            user: {
                firstName: string;
                lastName: string;
                employeeCode: string | null;
            };
            payments: {
                id: string;
                createdAt: Date;
                amount: import("@prisma/client/runtime/library").Decimal;
                notes: string | null;
                createdById: string | null;
                payrollRunId: string | null;
                payslipId: string | null;
                advanceId: string;
                paymentDate: Date;
                paymentType: string;
            }[];
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            companyId: string | null;
            type: import(".prisma/client").$Enums.AdvanceType;
            endDate: Date;
            startDate: Date;
            notes: string | null;
            userId: string;
            attachments: import("@prisma/client/runtime/library").JsonValue | null;
            currentStep: import(".prisma/client").$Enums.ApprovalStep;
            managerDecision: import(".prisma/client").$Enums.ApprovalDecision;
            managerDecisionAt: Date | null;
            managerNotes: string | null;
            hrDecision: import(".prisma/client").$Enums.ApprovalDecision;
            hrDecisionAt: Date | null;
            hrDecisionNotes: string | null;
            managerApproverId: string | null;
            hrApproverId: string | null;
            periodMonths: number;
            monthlyDeduction: import("@prisma/client/runtime/library").Decimal;
            approvedMonthlyDeduction: import("@prisma/client/runtime/library").Decimal | null;
            financeDecision: import(".prisma/client").$Enums.ApprovalDecision;
            financeDecisionAt: Date | null;
            financeDecisionNotes: string | null;
            ceoDecision: import(".prisma/client").$Enums.ApprovalDecision;
            ceoDecisionAt: Date | null;
            ceoDecisionNotes: string | null;
            approvalChain: import("@prisma/client/runtime/library").JsonValue | null;
            financeApproverId: string | null;
            ceoApproverId: string | null;
        }[];
        summary: {
            totalAdvances: number;
            totalAmount: any;
            totalPaid: any;
        };
    }>;
    getEmployees(req: any, query: EmployeeReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: EmployeeReportQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: {
            id: string;
            phone: string | null;
            email: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            status: import(".prisma/client").$Enums.UserStatus;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            hireDate: Date | null;
            nationality: string | null;
            isSaudi: boolean;
            jobTitleRef: {
                name: string;
            } | null;
            branch: {
                name: string;
            } | null;
            department: {
                name: string;
            } | null;
        }[];
    }>;
    getContractExpiry(req: any, query: ContractExpiryQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: {
                daysBeforeExpiry: number;
            };
            totalCount: number;
        };
        data: {
            estimatedContractEnd: Date | null;
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            hireDate: Date | null;
        }[];
    }>;
    getIqamaExpiry(req: any, query: ContractExpiryQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: {
                daysBeforeExpiry: number;
            };
            totalCount: number;
        };
        data: {
            daysRemaining: number | null;
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            nationality: string | null;
            iqamaNumber: string | null;
            iqamaExpiryDate: Date | null;
        }[];
    }>;
    getNationalities(req: any): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: {};
            totalCount: number;
        };
        data: {
            saudiCount: number;
            nonSaudiCount: number;
            saudizationRate: number;
            byNationality: {
                nationality: string;
                count: number;
            }[];
        };
    }>;
    getLeaveBalance(req: any, query: LeaveReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: {
                year: number;
            };
            totalCount: number;
        };
        data: {
            userId: string;
            employeeName: string;
            employeeCode: string | null;
            annualEntitlement: number;
            used: number;
            remaining: number;
            detailedBalances: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                companyId: string | null;
                year: number;
                userId: string;
                leaveTypeId: string;
                entitled: import("@prisma/client/runtime/library").Decimal;
                carriedForward: import("@prisma/client/runtime/library").Decimal;
                used: import("@prisma/client/runtime/library").Decimal;
                pending: import("@prisma/client/runtime/library").Decimal;
                timesUsed: number;
                carryForwardExpiresAt: Date | null;
            }[];
        }[];
    }>;
    getLeaveRequests(req: any, query: LeaveReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: LeaveReportQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: ({
            user: {
                firstName: string;
                lastName: string;
                employeeCode: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.LeaveStatus;
            companyId: string | null;
            type: import(".prisma/client").$Enums.LeaveType;
            endDate: Date;
            startDate: Date;
            notes: string | null;
            userId: string;
            requestedDays: number;
            approvedDays: number | null;
            reason: string;
            attachments: import("@prisma/client/runtime/library").JsonValue | null;
            currentStep: import(".prisma/client").$Enums.ApprovalStep;
            managerDecision: import(".prisma/client").$Enums.ApprovalDecision;
            managerDecisionAt: Date | null;
            managerNotes: string | null;
            managerAttachments: import("@prisma/client/runtime/library").JsonValue | null;
            hrDecision: import(".prisma/client").$Enums.ApprovalDecision;
            hrDecisionAt: Date | null;
            hrDecisionNotes: string | null;
            hrAttachments: import("@prisma/client/runtime/library").JsonValue | null;
            approverNotes: string | null;
            approvedAt: Date | null;
            fullPayDays: number | null;
            partialPayDays: number | null;
            unpaidDays: number | null;
            salaryImpact: import("@prisma/client/runtime/library").Decimal | null;
            noticeDaysProvided: number | null;
            managerApproverId: string | null;
            hrApproverId: string | null;
            approverId: string | null;
            leaveTypeConfigId: string | null;
        })[];
        summary: {
            byStatus: Record<string, number>;
        };
    }>;
    getCustodyInventory(req: any, query: CustodyReportQueryDto): Promise<{
        metadata: {
            reportName: string;
            reportNameEn: string;
            generatedAt: Date;
            filters: CustodyReportQueryDto;
            totalCount: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        data: ({
            category: {
                name: string;
            };
            assignments: ({
                employee: {
                    firstName: string;
                    lastName: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.CustodyAssignmentStatus;
                companyId: string;
                employeeId: string;
                notes: string | null;
                attachments: import("@prisma/client/runtime/library").JsonValue | null;
                approvedAt: Date | null;
                approvalChain: import("@prisma/client/runtime/library").JsonValue | null;
                approvedById: string | null;
                employeeSignature: string | null;
                custodyItemId: string;
                assignedAt: Date;
                expectedReturn: Date | null;
                actualReturn: Date | null;
                conditionOnAssign: import(".prisma/client").$Enums.CustodyCondition | null;
                conditionOnReturn: import(".prisma/client").$Enums.CustodyCondition | null;
                assignedById: string;
                signatureDate: Date | null;
            })[];
        } & {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.CustodyItemStatus;
            companyId: string;
            branchId: string | null;
            code: string;
            description: string | null;
            notes: string | null;
            attachments: import("@prisma/client/runtime/library").JsonValue | null;
            model: string | null;
            vendor: string | null;
            invoiceNumber: string | null;
            categoryId: string;
            serialNumber: string | null;
            brand: string | null;
            barcode: string | null;
            qrCode: string | null;
            purchaseDate: Date | null;
            purchasePrice: import("@prisma/client/runtime/library").Decimal | null;
            warrantyExpiry: Date | null;
            condition: import(".prisma/client").$Enums.CustodyCondition;
            currentLocation: string | null;
            imageUrl: string | null;
            currentAssigneeId: string | null;
        })[];
        summary: {
            totalItems: number;
            totalValue: number;
        };
    }>;
    getExecutiveDashboard(req: any): Promise<import("../dto/extended-report.dto").ExecutiveDashboardData>;
}
