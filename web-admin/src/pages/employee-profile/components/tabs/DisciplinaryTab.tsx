import { Box, Grid, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Gavel, CheckCircle, EmojiEvents } from '@mui/icons-material';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    teal: '#41B3A3',
    navy: '#2D3748',
    white: '#FFFFFF',
    yellow: '#F5C469',
    green: '#81C784',
    red: '#E57373',
};

interface DisciplinaryTabProps {
    profile: any;
}

export const DisciplinaryTab = ({ profile }: DisciplinaryTabProps) => {
    const p = profile as any;
    const cases = p.disciplinaryCases || [];

    const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('ar-SA');

    const getActionLabel = (action: string) => {
        const actions: Record<string, { label: string; color: string }> = {
            VERBAL_WARNING: { label: 'إنذار شفهي', color: theme.yellow },
            WRITTEN_WARNING: { label: 'إنذار كتابي', color: theme.coral },
            FINAL_WARNING: { label: 'إنذار نهائي', color: theme.red },
            SUSPENSION: { label: 'إيقاف', color: theme.red },
            TERMINATION: { label: 'فصل', color: theme.red },
        };
        return actions[action] || { label: action, color: theme.navy };
    };

    const getStatusLabel = (status: string) => {
        const statuses: Record<string, { label: string; color: string }> = {
            OPEN: { label: 'مفتوحة', color: theme.coral },
            UNDER_INVESTIGATION: { label: 'قيد التحقيق', color: theme.yellow },
            CLOSED: { label: 'مغلقة', color: theme.green },
        };
        return statuses[status] || { label: status, color: theme.navy };
    };

    if (cases.length === 0) {
        return (
            <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 6, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 3, borderRadius: '50%', bgcolor: `${theme.green}20`, width: 80, height: 80, mx: 'auto', mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EmojiEvents sx={{ fontSize: 40, color: theme.green }} />
                </Box>
                <Typography variant="h5" fontWeight="bold" color={theme.navy} mb={1}>سجل نظيف!</Typography>
                <Typography variant="body1" color="text.secondary">لا توجد قضايا تأديبية مسجلة لهذا الموظف</Typography>
                <Chip
                    icon={<CheckCircle />}
                    label="سلوك مثالي"
                    sx={{ mt: 3, bgcolor: theme.green, color: theme.white, fontWeight: 600 }}
                />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Summary */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                        <Typography variant="h2" fontWeight="bold" color={theme.coral}>{cases.length}</Typography>
                        <Typography variant="body1" color="text.secondary">إجمالي القضايا</Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                        <Typography variant="h2" fontWeight="bold" color={theme.yellow}>
                            {cases.filter((c: any) => c.status === 'OPEN' || c.status === 'UNDER_INVESTIGATION').length}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">قضايا مفتوحة</Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                        <Typography variant="h2" fontWeight="bold" color={theme.green}>
                            {cases.filter((c: any) => c.status === 'CLOSED').length}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">قضايا مغلقة</Typography>
                    </Box>
                </Grid>
            </Grid>

            {/* Cases Table */}
            <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Gavel sx={{ color: theme.coral }} />
                    <Typography variant="h6" fontWeight="bold" color={theme.navy}>سجل القضايا</Typography>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>التاريخ</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>المخالفة</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الإجراء</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الحالة</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {cases.map((c: any) => {
                                const actionInfo = getActionLabel(c.action);
                                const statusInfo = getStatusLabel(c.status);
                                return (
                                    <TableRow key={c.id} hover>
                                        <TableCell>{formatDate(c.createdAt)}</TableCell>
                                        <TableCell>{c.violation || '-'}</TableCell>
                                        <TableCell>
                                            <Chip label={actionInfo.label} size="small" sx={{ bgcolor: actionInfo.color, color: theme.white }} />
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={statusInfo.label} size="small" sx={{ bgcolor: statusInfo.color, color: theme.white }} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default DisciplinaryTab;
