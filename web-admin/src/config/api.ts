/**
 * API Configuration
 * Secure API endpoint configuration
 */

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    UPDATE_FCM_TOKEN: '/auth/fcm-token',
  },
  
  // Users
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    GET: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    ACTIVATE: (id: string) => `/users/${id}/activate`,
    PROFILE: '/users/me',
    UPDATE_PROFILE: '/users/me',
    CHANGE_PASSWORD: '/users/me/change-password',
    MY_TEAM: '/users/my-team',
    IMPORT: '/users/import',
  },
  
  // Attendance
  ATTENDANCE: {
    CHECK_IN: '/attendance/check-in',
    CHECK_OUT: '/attendance/check-out',
    TODAY: '/attendance/today',
    HISTORY: '/attendance/history',
    MONTHLY_STATS: (year: number, month: number) => `/attendance/stats/monthly/${year}/${month}`,
    ALL: '/attendance/admin/all',
    DAILY_STATS: '/attendance/admin/daily-stats',
  },
  
  // Branches
  BRANCHES: {
    LIST: '/branches',
    CREATE: '/branches',
    GET: (id: string) => `/branches/${id}`,
    UPDATE: (id: string) => `/branches/${id}`,
    DELETE: (id: string) => `/branches/${id}`,
    TOGGLE_STATUS: (id: string) => `/branches/${id}/toggle-status`,
    SCHEDULE: (id: string) => `/branches/${id}/schedule`,
    UPDATE_SCHEDULE: (id: string) => `/branches/${id}/schedule`,
  },
  
  // Departments
  DEPARTMENTS: {
    LIST: '/branches/departments/all',
    CREATE: '/branches/departments',
    UPDATE: (id: string) => `/branches/departments/${id}`,
    DELETE: (id: string) => `/branches/departments/${id}`,
  },
  
  // Leaves
  LEAVES: {
    CREATE: '/leaves',
    MY: '/leaves/my',
    GET: (id: string) => `/leaves/${id}`,
    CANCEL: (id: string) => `/leaves/${id}`,
    PENDING: '/leaves/pending/all',
    APPROVE: (id: string) => `/leaves/${id}/approve`,
    REJECT: (id: string) => `/leaves/${id}/reject`,
    ALL: '/leaves/admin/all',
    WORK_FROM_HOME: '/leaves/work-from-home',
    DISABLE_WFH: (userId: string, date: string) => `/leaves/work-from-home/${userId}/${date}`,
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    DELETE: (id: string) => `/notifications/${id}`,
    BROADCAST: '/notifications/broadcast',
  },
  
  // Reports
  REPORTS: {
    DASHBOARD: '/reports/dashboard',
    ATTENDANCE: '/reports/attendance',
    EMPLOYEE: (userId: string) => `/reports/employee/${userId}`,
    BRANCH: (branchId: string) => `/reports/branch/${branchId}`,
    LATE: '/reports/late',
    PAYROLL: '/reports/payroll',
    EXPORT_EXCEL: (type: string) => `/reports/export/excel/${type}`,
    EXPORT_PDF: (type: string) => `/reports/export/pdf/${type}`,
  },
  
  // Settings
  SETTINGS: {
    LIST: '/settings',
    GET: (key: string) => `/settings/${key}`,
    SET: '/settings',
    BULK_SET: '/settings/bulk',
    DELETE: (key: string) => `/settings/${key}`,
  },
  
  // Holidays
  HOLIDAYS: {
    LIST: '/settings/holidays/all',
    CREATE: '/settings/holidays',
    UPDATE: (id: string) => `/settings/holidays/${id}`,
    DELETE: (id: string) => `/settings/holidays/${id}`,
  },
  
  // Audit
  AUDIT: {
    LOGS: '/audit/logs',
    SUSPICIOUS: '/audit/suspicious',
  },
} as const;

