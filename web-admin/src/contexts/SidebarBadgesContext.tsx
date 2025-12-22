import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/services/api.service';

interface SidebarBadges {
    pendingLeaves: number;
    pendingAdvances: number;
    pendingRaises: number;
    pendingLetters: number;
    totalPendingRequests: number;
    complianceActions: number;
    wpsActionRequired: number;
    mudadActionRequired: number;
}

interface SidebarBadgesContextType {
    badges: SidebarBadges;
    isLoading: boolean;
    refresh: () => void;
}

const defaultBadges: SidebarBadges = {
    pendingLeaves: 0,
    pendingAdvances: 0,
    pendingRaises: 0,
    pendingLetters: 0,
    totalPendingRequests: 0,
    complianceActions: 0,
    wpsActionRequired: 0,
    mudadActionRequired: 0,
};

const SidebarBadgesContext = createContext<SidebarBadgesContextType>({
    badges: defaultBadges,
    isLoading: false,
    refresh: () => { },
});

export const useSidebarBadges = () => useContext(SidebarBadgesContext);

interface Props {
    children: ReactNode;
}

export function SidebarBadgesProvider({ children }: Props) {
    const [badges, setBadges] = useState<SidebarBadges>(defaultBadges);
    const [isLoading, setIsLoading] = useState(false);

    const fetchBadges = async () => {
        setIsLoading(true);
        try {
            // Fetch all badge data in parallel
            const [exceptionsRes, wpsStatsRes, mudadStatsRes] = await Promise.allSettled([
                api.get('/dashboard/exceptions'),
                api.get('/wps-tracking/stats'),
                api.get('/mudad/stats'),
            ]);

            let newBadges = { ...defaultBadges };

            // Parse exceptions data
            if (exceptionsRes.status === 'fulfilled') {
                const exceptions = exceptionsRes.value as any;
                newBadges.pendingLeaves = exceptions?.pendingLeaves || 0;
                newBadges.pendingAdvances = exceptions?.pendingAdvances || 0;
                newBadges.pendingRaises = exceptions?.pendingRaises || 0;
                newBadges.pendingLetters = exceptions?.pendingLetters || 0;
                newBadges.totalPendingRequests =
                    newBadges.pendingLeaves +
                    newBadges.pendingAdvances +
                    newBadges.pendingRaises +
                    newBadges.pendingLetters;
            }

            // Parse WPS stats
            if (wpsStatsRes.status === 'fulfilled') {
                const wpsStats = wpsStatsRes.value as any;
                newBadges.wpsActionRequired = (wpsStats?.pending || 0) + (wpsStats?.rejected || 0);
            }

            // Parse Mudad stats
            if (mudadStatsRes.status === 'fulfilled') {
                const mudadStats = mudadStatsRes.value as any;
                newBadges.mudadActionRequired =
                    (mudadStats?.pending || 0) +
                    (mudadStats?.rejected || 0) +
                    (mudadStats?.resubmitRequired || 0);
            }

            // Total compliance actions
            newBadges.complianceActions = newBadges.wpsActionRequired + newBadges.mudadActionRequired;

            setBadges(newBadges);
        } catch (error) {
            console.error('Failed to fetch sidebar badges:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBadges();
        // Refresh every 2 minutes
        const interval = setInterval(fetchBadges, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <SidebarBadgesContext.Provider value={{ badges, isLoading, refresh: fetchBadges }}>
            {children}
        </SidebarBadgesContext.Provider>
    );
}
