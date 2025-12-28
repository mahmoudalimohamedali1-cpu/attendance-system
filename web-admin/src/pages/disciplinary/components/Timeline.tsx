import {
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Avatar,
    Chip
} from '@mui/material';
import {
    History,
    Person,
    CheckCircle,
    Gavel,
    Description,
    Schedule
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CaseEvent {
    id: string;
    eventType: string;
    message: string;
    createdAt: string;
    actor?: {
        firstName: string;
        lastName: string;
    };
}

interface TimelineProps {
    events: CaseEvent[];
}

export const Timeline = ({ events }: TimelineProps) => {
    const getEventIcon = (type: string) => {
        switch (type) {
            case 'CASE_CREATED': return <Description color="primary" />;
            case 'HEARING_SCHEDULED': return <Schedule color="warning" />;
            case 'DECISION_ISSUED': return <Gavel color="secondary" />;
            case 'FINALIZED': return <CheckCircle color="success" />;
            default: return <History />;
        }
    };

    return (
        <Box sx={{ maxWidth: 600, p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <History /> سجل الإجراءات (الجدول الزمني)
            </Typography>

            <Stepper orientation="vertical" sx={{ direction: 'rtl' }}>
                {events.map((event) => (
                    <Step key={event.id} active={true}>
                        <StepLabel
                            StepIconComponent={() => (
                                <Avatar sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', width: 32, height: 32 }}>
                                    {getEventIcon(event.eventType)}
                                </Avatar>
                            )}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                    {event.message}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {format(new Date(event.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ar })}
                                </Typography>
                            </Box>
                        </StepLabel>
                        <StepContent>
                            <Box sx={{ mb: 2, mt: 1 }}>
                                {event.actor && (
                                    <Chip
                                        size="small"
                                        icon={<Person sx={{ fontSize: '16px !important' }} />}
                                        label={`${event.actor.firstName} ${event.actor.lastName}`}
                                        variant="outlined"
                                        sx={{ borderRadius: 1 }}
                                    />
                                )}
                            </Box>
                        </StepContent>
                    </Step>
                ))}
            </Stepper>
        </Box>
    );
};
