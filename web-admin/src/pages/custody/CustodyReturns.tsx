import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, CircularProgress, TextField, Alert,
    Checkbox, FormControlLabel
} from '@mui/material';
import { Check, Close, Refresh } from '@mui/icons-material';
import custodyService, { CustodyReturn } from '../../services/custody.service';

const conditionLabels: Record<string, string> = {
    NEW: 'جديدة', EXCELLENT: 'ممتازة', GOOD: 'جيدة', FAIR: 'مقبولة', POOR: 'سيئة',
};

export default function CustodyReturns() {
    const [loading, setLoading] = useState(true);
    const [returns, setReturns] = useState<CustodyReturn[]>([]);
    const [reviewDialog, setReviewDialog] = useState<{ open: boolean; item: CustodyReturn | null; decision: 'APPROVED' | 'REJECTED'; notes: string; cost: number; charge: boolean }>({
        open: false, item: null, decision: 'APPROVED', notes: '', cost: 0, charge: false
    });

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const data = await custodyService.getPendingReturns();
            setReturns(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReturns(); }, []);

    const handleReview = async () => {
        if (!reviewDialog.item) return;
        try {
            await custodyService.reviewReturn({
                returnId: reviewDialog.item.id,
                decision: reviewDialog.decision,
                reviewNotes: reviewDialog.notes,
                estimatedCost: reviewDialog.cost,
                chargeEmployee: reviewDialog.charge,
            });
            setReviewDialog({ open: false, item: null, decision: 'APPROVED', notes: '', cost: 0, charge: false });
            fetchReturns();
        } catch (err: any) {
            alert(err.message || 'فشل في المراجعة');
        }
    };

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">🔄 طلبات إرجاع العهد</Typography>
                <IconButton onClick={fetchReturns}><Refresh /></IconButton>
            </Box>

            <Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell>العهدة</TableCell>
                                <TableCell>الموظف</TableCell>
                                <TableCell>تاريخ الطلب</TableCell>
                                <TableCell>حالة العهدة</TableCell>
                                <TableCell>سبب الإرجاع</TableCell>
                                <TableCell>ملاحظات التلف</TableCell>
                                <TableCell align="center">إجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={30} /></TableCell></TableRow>
                            ) : returns.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center">لا توجد طلبات إرجاع معلقة</TableCell></TableRow>
                            ) : returns.map((ret) => (
                                <TableRow key={ret.id} hover>
                                    <TableCell><strong>{ret.custodyItem?.name}</strong><br /><small>{ret.custodyItem?.code}</small></TableCell>
                                    <TableCell>{ret.returnedBy?.firstName} {ret.returnedBy?.lastName}</TableCell>
                                    <TableCell>{new Date(ret.returnDate).toLocaleDateString('ar-SA')}</TableCell>
                                    <TableCell><Chip size="small" label={conditionLabels[ret.conditionOnReturn] || ret.conditionOnReturn} color={ret.conditionOnReturn === 'POOR' ? 'error' : 'default'} /></TableCell>
                                    <TableCell>{ret.returnReason || '-'}</TableCell>
                                    <TableCell>{ret.damageDescription || '-'}</TableCell>
                                    <TableCell align="center">
                                        <IconButton color="success" onClick={() => setReviewDialog({ open: true, item: ret, decision: 'APPROVED', notes: '', cost: 0, charge: false })}><Check /></IconButton>
                                        <IconButton color="error" onClick={() => setReviewDialog({ open: true, item: ret, decision: 'REJECTED', notes: '', cost: 0, charge: false })}><Close /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ ...reviewDialog, open: false })} maxWidth="sm" fullWidth>
                <DialogTitle>{reviewDialog.decision === 'APPROVED' ? '✅ قبول الإرجاع' : '❌ رفض الإرجاع'}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <Typography>العهدة: <strong>{reviewDialog.item?.custodyItem?.name}</strong></Typography>
                        <TextField label="ملاحظات المراجعة" multiline rows={2} value={reviewDialog.notes} onChange={(e) => setReviewDialog({ ...reviewDialog, notes: e.target.value })} />
                        {reviewDialog.decision === 'APPROVED' && reviewDialog.item?.damageDescription && (
                            <>
                                <TextField label="تكلفة الإصلاح/التعويض" type="number" value={reviewDialog.cost} onChange={(e) => setReviewDialog({ ...reviewDialog, cost: parseFloat(e.target.value) || 0 })} />
                                <FormControlLabel
                                    control={<Checkbox checked={reviewDialog.charge} onChange={(e) => setReviewDialog({ ...reviewDialog, charge: e.target.checked })} color="warning" />}
                                    label="خصم من راتب الموظف"
                                />
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReviewDialog({ ...reviewDialog, open: false })}>إلغاء</Button>
                    <Button variant="contained" color={reviewDialog.decision === 'APPROVED' ? 'success' : 'error'} onClick={handleReview}>
                        {reviewDialog.decision === 'APPROVED' ? 'قبول' : 'رفض'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
