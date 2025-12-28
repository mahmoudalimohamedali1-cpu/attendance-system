import { Box, Grid, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Inventory, Category, CheckCircle } from '@mui/icons-material';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    teal: '#41B3A3',
    navy: '#2D3748',
    white: '#FFFFFF',
    yellow: '#F5C469',
    green: '#81C784',
};

interface CustodyTabProps {
    profile: any;
}

export const CustodyTab = ({ profile }: CustodyTabProps) => {
    const p = profile as any;
    const assignments = p.custodyAssignments || [];

    const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('ar-SA');

    const getConditionLabel = (condition: string) => {
        const conditions: Record<string, { label: string; color: string }> = {
            NEW: { label: 'جديد', color: theme.green },
            EXCELLENT: { label: 'ممتاز', color: theme.teal },
            GOOD: { label: 'جيد', color: theme.teal },
            FAIR: { label: 'مقبول', color: theme.yellow },
            POOR: { label: 'سيء', color: theme.coral },
            DAMAGED: { label: 'تالف', color: theme.coral },
        };
        return conditions[condition] || { label: condition, color: theme.navy };
    };

    // Calculate total value
    const totalValue = assignments.reduce((sum: number, a: any) => sum + (Number(a.custodyItem?.purchasePrice) || 0), 0);

    if (assignments.length === 0) {
        return (
            <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 6, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 3, borderRadius: '50%', bgcolor: `${theme.coral}20`, width: 80, height: 80, mx: 'auto', mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Inventory sx={{ fontSize: 40, color: theme.coral }} />
                </Box>
                <Typography variant="h5" fontWeight="bold" color={theme.navy} mb={1}>لا توجد عهد</Typography>
                <Typography variant="body1" color="text.secondary">لم يتم تسليم أي عهد لهذا الموظف</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Summary Cards */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: `${theme.coral}20`, width: 50, height: 50, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Inventory sx={{ color: theme.coral }} />
                        </Box>
                        <Typography variant="h3" fontWeight="bold" color={theme.navy}>{assignments.length}</Typography>
                        <Typography variant="body1" color="text.secondary">عهدة مسلمة</Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: `${theme.teal}20`, width: 50, height: 50, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Category sx={{ color: theme.teal }} />
                        </Box>
                        <Typography variant="h3" fontWeight="bold" color={theme.navy}>
                            {new Set(assignments.map((a: any) => a.custodyItem?.category?.name)).size}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">فئة مختلفة</Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: theme.teal, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center', color: theme.white }}>
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)', width: 50, height: 50, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle sx={{ color: theme.white }} />
                        </Box>
                        <Typography variant="h4" fontWeight="bold">
                            {totalValue.toLocaleString()} ر.س
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>إجمالي القيمة</Typography>
                    </Box>
                </Grid>
            </Grid>

            {/* Custody Items Table */}
            <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Inventory sx={{ color: theme.coral }} />
                    <Typography variant="h6" fontWeight="bold" color={theme.navy}>تفاصيل العهد</Typography>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>الأصل</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الفئة</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الرقم التسلسلي</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>تاريخ التسليم</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الحالة</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>القيمة</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {assignments.map((a: any) => {
                                const condition = getConditionLabel(a.conditionOnAssignment || 'GOOD');
                                return (
                                    <TableRow key={a.id} hover>
                                        <TableCell>
                                            <Typography fontWeight={600}>{a.custodyItem?.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={a.custodyItem?.category?.name || '-'} size="small" sx={{ bgcolor: `${theme.coral}20`, color: theme.coral }} />
                                        </TableCell>
                                        <TableCell>{a.custodyItem?.serialNumber || '-'}</TableCell>
                                        <TableCell>{formatDate(a.assignedAt)}</TableCell>
                                        <TableCell>
                                            <Chip label={condition.label} size="small" sx={{ bgcolor: condition.color, color: theme.white }} />
                                        </TableCell>
                                        <TableCell>{a.custodyItem?.purchasePrice ? `${Number(a.custodyItem.purchasePrice).toLocaleString()} ر.س` : '-'}</TableCell>
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

export default CustodyTab;
