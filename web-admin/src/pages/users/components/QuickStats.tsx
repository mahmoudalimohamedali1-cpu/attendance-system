import { Box, Typography, Skeleton } from '@mui/material';
import {
    People,
    PersonAdd,
    BeachAccess,
    HourglassEmpty,
    TrendingUp,
    TrendingDown,
} from '@mui/icons-material';

interface QuickStatsProps {
    totalActive: number;
    newThisMonth: number;
    onLeaveToday: number;
    pendingApprovals: number;
    isLoading?: boolean;
}

interface StatItemProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    trend?: number;
    color: string;
    bgColor: string;
}

const StatItem = ({ icon, label, value, trend, color, bgColor }: StatItemProps) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: bgColor,
            borderRadius: 3,
            px: 3,
            py: 2,
            flex: 1,
            minWidth: 200,
            transition: 'all 0.3s ease',
            cursor: 'default',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
            },
        }}
    >
        <Box
            sx={{
                bgcolor: color,
                borderRadius: 2,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: `0 4px 15px ${color}40`,
            }}
        >
            {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" fontWeight="bold" color="text.primary">
                    {value.toLocaleString('ar-SA')}
                </Typography>
                {trend !== undefined && trend !== 0 && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.3,
                            color: trend > 0 ? '#4CAF50' : '#F44336',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                        }}
                    >
                        {trend > 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                        <span>{Math.abs(trend)}%</span>
                    </Box>
                )}
            </Box>
        </Box>
    </Box>
);

const StatSkeleton = () => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: '#f5f5f5',
            borderRadius: 3,
            px: 3,
            py: 2,
            flex: 1,
            minWidth: 200,
        }}
    >
        <Skeleton variant="rounded" width={48} height={48} />
        <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="text" width={60} height={32} />
        </Box>
    </Box>
);

export const QuickStats = ({
    totalActive,
    newThisMonth,
    onLeaveToday,
    pendingApprovals,
    isLoading = false,
}: QuickStatsProps) => {
    if (isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    mb: 3,
                    flexWrap: 'wrap',
                }}
            >
                {[1, 2, 3, 4].map((i) => (
                    <StatSkeleton key={i} />
                ))}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 2,
                mb: 3,
                flexWrap: 'wrap',
            }}
        >
            <StatItem
                icon={<People />}
                label="الموظفين النشطين"
                value={totalActive}
                color="#4CAF50"
                bgColor="#E8F5E9"
            />
            <StatItem
                icon={<PersonAdd />}
                label="جديد هذا الشهر"
                value={newThisMonth}
                trend={newThisMonth > 0 ? 15 : 0}
                color="#2196F3"
                bgColor="#E3F2FD"
            />
            <StatItem
                icon={<BeachAccess />}
                label="في إجازة اليوم"
                value={onLeaveToday}
                color="#FF9800"
                bgColor="#FFF3E0"
            />
            <StatItem
                icon={<HourglassEmpty />}
                label="طلبات معلقة"
                value={pendingApprovals}
                color="#9C27B0"
                bgColor="#F3E5F5"
            />
        </Box>
    );
};

export default QuickStats;
