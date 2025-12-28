import { Box, Typography } from '@mui/material';
import { useMemo } from 'react';

interface LeaveBalanceData {
    type: string;
    total: number;
    used: number;
    remaining: number;
    color: string;
}

interface LeaveBalanceChartProps {
    balances: LeaveBalanceData[];
}

const DonutSegment = ({
    percentage,
    color,
    rotation,
    size = 120,
}: {
    percentage: number;
    color: string;
    rotation: number;
    size?: number;
}) => {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

    return (
        <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center',
                transition: 'stroke-dasharray 0.6s ease-out',
            }}
        />
    );
};

export const LeaveBalanceChart = ({ balances }: LeaveBalanceChartProps) => {
    const totalDays = useMemo(() =>
        balances.reduce((sum, b) => sum + b.total, 0),
        [balances]
    );

    const usedDays = useMemo(() =>
        balances.reduce((sum, b) => sum + b.used, 0),
        [balances]
    );

    const usedPercentage = totalDays > 0 ? Math.round((usedDays / totalDays) * 100) : 0;

    // Calculate segments for donut chart
    const segments = useMemo(() => {
        let currentRotation = -90;
        return balances.map((balance) => {
            const percentage = totalDays > 0 ? (balance.used / totalDays) * 100 : 0;
            const segment = {
                ...balance,
                percentage,
                rotation: currentRotation,
            };
            currentRotation += (percentage / 100) * 360;
            return segment;
        });
    }, [balances, totalDays]);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                رصيد الإجازات
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, mt: 2 }}>
                {/* Donut Chart */}
                <Box sx={{ position: 'relative', width: 120, height: 120 }}>
                    <svg width="120" height="120">
                        {/* Background circle */}
                        <circle
                            cx="60"
                            cy="60"
                            r="48"
                            fill="none"
                            stroke="#E0E0E0"
                            strokeWidth="12"
                        />
                        {/* Segments */}
                        {segments.map((segment, index) => (
                            <DonutSegment
                                key={index}
                                percentage={segment.percentage}
                                color={segment.color}
                                rotation={segment.rotation}
                            />
                        ))}
                    </svg>
                    {/* Center text */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                        }}
                    >
                        <Typography variant="h5" fontWeight="bold" color="text.primary">
                            {usedPercentage}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            مستخدم
                        </Typography>
                    </Box>
                </Box>

                {/* Legend */}
                <Box sx={{ flex: 1 }}>
                    {balances.map((balance, index) => (
                        <Box
                            key={index}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 1.5,
                                pb: 1,
                                borderBottom: index < balances.length - 1 ? '1px solid #F0F0F0' : 'none',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                    sx={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        bgcolor: balance.color,
                                    }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                    {balance.type}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="body2" fontWeight={600}>
                                    {balance.remaining} / {balance.total}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    متبقي
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default LeaveBalanceChart;
