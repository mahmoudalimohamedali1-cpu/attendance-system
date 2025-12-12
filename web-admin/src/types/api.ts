/**
 * API Types
 * Type definitions for API requests and responses
 */

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  success: boolean;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  data?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  employeeCode?: string;
  jobTitle?: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  salary?: number;
  hireDate?: string;
  branch?: Branch;
  department?: Department;
  manager?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  nameEn?: string;
  address?: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  timezone: string;
  workStartTime: string;
  workEndTime: string;
  lateGracePeriod: number;
  earlyCheckInPeriod: number;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  nameEn?: string;
  branchId: string;
}

export interface Attendance {
  id: string;
  userId: string;
  branchId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'PRESENT' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'ON_LEAVE' | 'WORK_FROM_HOME';
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workingMinutes: number;
  overtimeMinutes: number;
  isWorkFromHome: boolean;
  user?: User;
  branch?: Branch;
}

export interface DashboardStats {
  employees: {
    total: number;
    active: number;
  };
  today: {
    present: number;
    late: number;
    earlyLeave: number;
    absent: number;
    workFromHome: number;
  };
  pendingLeaves: number;
}

