import React, { useEffect, useState } from 'react';
import { Box, Typography, Stack, Chip, Skeleton, Alert } from '@mui/material';
import { Business, People, LocationCity, SupervisorAccount } from '@mui/icons-material';
import { EnhancedOrgChart, OrgNode } from '@/components/org-chart/OrgChart';
import { organizationService, OrgStats } from '@/services/organization.service';
import { GlassCard } from '@/components/premium';

/**
 * صفحة الهيكل التنظيمي - ZenHR Style
 */
const OrgStructurePage: React.FC = () => {
    const [orgData, setOrgData] = useState<OrgNode | null>(null);
    const [stats, setStats] = useState<OrgStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [structure, orgStats] = await Promise.all([
                organizationService.getOrgStructure(),
                organizationService.getOrgStats(),
            ]);

            setOrgData(structure);
            setStats(orgStats);
        } catch (err: any) {
            console.error('Error fetching org structure:', err);
            setError('حدث خطأ أثناء تحميل الهيكل التنظيمي');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    🏢 الهيكل التنظيمي
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    عرض تفاعلي للهيكل التنظيمي للشركة - يمكنك البحث والتكبير والتصغير والضغط على أي موظف لعرض ملفه
                </Typography>
            </Box>

            {/* Stats Cards */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
                <StatCard
                    icon={<People />}
                    label="إجمالي الموظفين"
                    value={stats?.totalEmployees}
                    color="#667eea"
                    loading={loading}
                />
                <StatCard
                    icon={<SupervisorAccount />}
                    label="المدراء"
                    value={stats?.managers}
                    color="#22c55e"
                    loading={loading}
                />
                <StatCard
                    icon={<Business />}
                    label="الأقسام"
                    value={stats?.departments}
                    color="#f59e0b"
                    loading={loading}
                />
                <StatCard
                    icon={<LocationCity />}
                    label="الفروع"
                    value={stats?.branches}
                    color="#06b6d4"
                    loading={loading}
                />
            </Stack>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Org Chart */}
            <EnhancedOrgChart data={orgData} loading={loading} />
        </Box>
    );
};

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value?: number;
    color: string;
    loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, loading }) => (
    <GlassCard
        sx={{
            p: 2,
            minWidth: 160,
            flex: '1 1 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${color}20`,
            },
        }}
    >
        <Box
            sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${color}20, ${color}10)`,
                color: color,
            }}
        >
            {icon}
        </Box>
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            {loading ? (
                <Skeleton width={40} height={32} />
            ) : (
                <Typography variant="h5" fontWeight="bold" color={color}>
                    {value ?? 0}
                </Typography>
            )}
        </Box>
    </GlassCard>
);

export default OrgStructurePage;
