/**
 * Dashboard Service - Frontend API Client
 */

import { api } from './api.service';
import {
    DashboardSummary,
    DashboardHealth,
    DashboardExceptions,
    DashboardTrends,
    RoleBasedDashboard,
    DashboardParams
} from '../types/dashboard.types';

const BASE_URL = '/dashboard';

/**
 * Get combined role-based dashboard data
 */
export const getDashboard = async (params?: DashboardParams): Promise<RoleBasedDashboard> => {
    return api.get<RoleBasedDashboard>(BASE_URL, {
        params: {
            year: params?.year || new Date().getFullYear(),
            month: params?.month || new Date().getMonth() + 1,
        }
    });
};

/**
 * Get executive summary (main cards)
 */
export const getSummary = async (params?: DashboardParams): Promise<Partial<DashboardSummary>> => {
    return api.get<Partial<DashboardSummary>>(`${BASE_URL}/summary`, {
        params: {
            year: params?.year || new Date().getFullYear(),
            month: params?.month || new Date().getMonth() + 1,
        }
    });
};

/**
 * Get payroll health status
 */
export const getHealth = async (params?: DashboardParams): Promise<Partial<DashboardHealth>> => {
    return api.get<Partial<DashboardHealth>>(`${BASE_URL}/health`, {
        params: {
            year: params?.year || new Date().getFullYear(),
            month: params?.month || new Date().getMonth() + 1,
        }
    });
};

/**
 * Get exceptions and alerts
 */
export const getExceptions = async (params?: DashboardParams): Promise<Partial<DashboardExceptions>> => {
    return api.get<Partial<DashboardExceptions>>(`${BASE_URL}/exceptions`, {
        params: {
            year: params?.year || new Date().getFullYear(),
            month: params?.month || new Date().getMonth() + 1,
        }
    });
};

/**
 * Get payroll trends
 */
export const getTrends = async (months: number = 4): Promise<Partial<DashboardTrends>> => {
    return api.get<Partial<DashboardTrends>>(`${BASE_URL}/trends`, {
        params: { months }
    });
};

export default {
    getDashboard,
    getSummary,
    getHealth,
    getExceptions,
    getTrends,
};
