/**
 * QIWA API Interfaces
 * Defines types for QIWA platform integration
 */

/**
 * QIWA API Authentication Response
 */
export interface QiwaAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * QIWA API Contract Registration Request
 */
export interface QiwaContractRegistrationRequest {
  contractNumber: string;
  employeeNationalId: string;
  employeeIqamaNumber?: string;
  employeeName: string;
  contractType: 'PERMANENT' | 'FIXED_TERM' | 'PART_TIME' | 'SEASONAL';
  startDate: string;
  endDate?: string;
  jobTitle: string;
  basicSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: number;
  workingHoursPerWeek: number;
  annualLeaveDays: number;
  establishmentId: string;
}

/**
 * QIWA API Contract Registration Response
 */
export interface QiwaContractRegistrationResponse {
  contractId: string;
  status: QiwaContractStatus;
  submissionDate: string;
  message?: string;
}

/**
 * QIWA Contract Status
 */
export enum QiwaContractStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  AUTHENTICATED = 'AUTHENTICATED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

/**
 * QIWA API Contract Status Response
 */
export interface QiwaContractStatusResponse {
  contractId: string;
  status: QiwaContractStatus;
  lastUpdated: string;
  rejectionReason?: string;
  authenticatedDate?: string;
}

/**
 * QIWA API Error Response
 */
export interface QiwaApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * QIWA API Client Configuration
 */
export interface QiwaApiConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  establishmentId: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * QIWA API Rate Limit Info
 */
export interface QiwaRateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}
