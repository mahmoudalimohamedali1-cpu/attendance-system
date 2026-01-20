/**
 * usePermissions Hook - Fetch and check user permissions
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api.service';
import { useAuthStore } from '@/store/auth.store';

interface UserPermission {
    id: string;
    scope: string;
    permission: {
        code: string;
        name: string;
    };
}

interface UsePermissionsResult {
    permissions: string[];
    isLoading: boolean;
    hasPermission: (code: string) => boolean;
    hasAnyPermission: (codes: string[]) => boolean;
    hasAllPermissions: (codes: string[]) => boolean;
    refetch: () => Promise<void>;
}

// Cache for permissions to avoid multiple fetches
let cachedPermissions: string[] | null = null;
let cachePromise: Promise<string[]> | null = null;

export const usePermissions = (): UsePermissionsResult => {
    const { user } = useAuthStore();
    const [permissions, setPermissions] = useState<string[]>(cachedPermissions || []);
    const [isLoading, setIsLoading] = useState(!cachedPermissions);

    const fetchPermissions = useCallback(async () => {
        // If already fetching, wait for same promise
        if (cachePromise) {
            const result = await cachePromise;
            setPermissions(result);
            setIsLoading(false);
            return;
        }

        // If cached, use cache
        if (cachedPermissions) {
            setPermissions(cachedPermissions);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        cachePromise = api.get<UserPermission[]>('/permissions/my')
            .then((response) => {
                const codes = response
                    .map((up) => up.permission?.code)
                    .filter(Boolean) as string[];
                cachedPermissions = codes;
                return codes;
            })
            .catch((error) => {
                console.error('Failed to fetch permissions:', error);
                return [];
            })
            .finally(() => {
                cachePromise = null;
            });

        const result = await cachePromise;
        setPermissions(result);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (user) {
            fetchPermissions();
        } else {
            setPermissions([]);
            setIsLoading(false);
        }
    }, [user, fetchPermissions]);

    // Check if user has a specific permission
    const hasPermission = useCallback((code: string): boolean => {
        // Admins have all permissions
        if (user?.role === 'ADMIN') return true;
        return permissions.includes(code);
    }, [permissions, user?.role]);

    // Check if user has any of the specified permissions
    const hasAnyPermission = useCallback((codes: string[]): boolean => {
        if (user?.role === 'ADMIN') return true;
        return codes.some((code) => permissions.includes(code));
    }, [permissions, user?.role]);

    // Check if user has all of the specified permissions
    const hasAllPermissions = useCallback((codes: string[]): boolean => {
        if (user?.role === 'ADMIN') return true;
        return codes.every((code) => permissions.includes(code));
    }, [permissions, user?.role]);

    // Force refetch
    const refetch = useCallback(async () => {
        cachedPermissions = null;
        await fetchPermissions();
    }, [fetchPermissions]);

    return {
        permissions,
        isLoading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refetch,
    };
};

// Social Feed permission codes
export const SOCIAL_FEED_PERMISSIONS = {
    VIEW: 'SOCIAL_FEED_VIEW',
    POST: 'SOCIAL_FEED_POST',
    ANNOUNCEMENT: 'SOCIAL_FEED_ANNOUNCEMENT',
    PIN: 'SOCIAL_FEED_PIN',
    DELETE_ANY: 'SOCIAL_FEED_DELETE_ANY',
    MODERATE: 'SOCIAL_FEED_MODERATE',
} as const;
