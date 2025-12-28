import { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Paper } from '@mui/material';
import { Timer } from '@mui/icons-material';

interface CountdownProps {
    deadline: string | Date;
    title: string;
    totalDays: number;
}

export const Countdown = ({ deadline, title, totalDays }: CountdownProps) => {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    const deadlineDate = new Date(deadline);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const diff = deadlineDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                clearInterval(timer);
                return;
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
        }, 1000);

        return () => clearInterval(timer);
    }, [deadline]);

    // Calculate progress
    // We don't have the exact start date here, but we can estimate based on totalDays
    // Let's assume progress is: (totalDays - daysRemaining) / totalDays
    const totalSeconds = totalDays * 24 * 60 * 60;
    const now = new Date();
    const secondsRemaining = (deadlineDate.getTime() - now.getTime()) / 1000;
    const progress = Math.max(0, Math.min(100, (1 - secondsRemaining / totalSeconds) * 100));

    const isCritical = secondsRemaining < 24 * 60 * 60 * 3; // Less than 3 days

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: isCritical ? 'error.light' : 'background.paper', opacity: isCritical ? 0.9 : 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                <Timer color={isCritical ? 'error' : 'primary'} />
                <Typography variant="subtitle2" fontWeight="bold">
                    {title}
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 1, justifyContent: 'center' }}>
                {[
                    { label: 'يوم', value: timeLeft.days },
                    { label: 'ساعة', value: timeLeft.hours },
                    { label: 'دقيقة', value: timeLeft.minutes },
                    { label: 'ثانية', value: timeLeft.seconds }
                ].map((item, idx) => (
                    <Box key={idx} sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight="bold">
                            {item.value.toString().padStart(2, '0')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {item.label}
                        </Typography>
                    </Box>
                ))}
            </Box>

            <LinearProgress
                variant="determinate"
                value={progress}
                color={isCritical ? 'error' : 'primary'}
                sx={{ height: 8, borderRadius: 4 }}
            />
        </Paper>
    );
};
