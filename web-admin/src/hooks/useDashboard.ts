/**
 * Dashboard Hooks - React Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import dashboardService from '../services/dashboard.service';
import { DashboardParams } from '../types/dashboard.types';

const STALE_TIME = 60 * 1000; // 1 minute
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for combined role-based dashboard
 */
export const useDashboard = (params?: DashboardParams) => {
    return useQuery({
        queryKey: ['dashboard', params?.year, params?.month],
        queryFn: () => dashboardService.getDashboard(params),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
    });
};

/**
 * Hook for executive summary
 */
export const useDashboardSummary = (params?: DashboardParams) => {
    return useQuery({
        queryKey: ['dashboard', 'summary', params?.year, params?.month],
        queryFn: () => dashboardService.getSummary(params),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
    });
};

/**
 * Hook for health status
 */
export const useDashboardHealth = (params?: DashboardParams) => {
    return useQuery({
        queryKey: ['dashboard', 'health', params?.year, params?.month],
        queryFn: () => dashboardService.getHealth(params),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
    });
};

/**
 * Hook for exceptions
 */
export const useDashboardExceptions = (params?: DashboardParams) => {
    return useQuery({
        queryKey: ['dashboard', 'exceptions', params?.year, params?.month],
        queryFn: () => dashboardService.getExceptions(params),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
    });
};

/**
 * Hook for trends
 */
export const useDashboardTrends = (months: number = 4) => {
    return useQuery({
        queryKey: ['dashboard', 'trends', months],
        queryFn: () => dashboardService.getTrends(months),
        staleTime: STALE_TIME * 5, // Trends don't change often
        gcTime: CACHE_TIME * 2,
    });
};
