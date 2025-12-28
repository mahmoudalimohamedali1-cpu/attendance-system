import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, CircularProgress, TextField, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { Add, Refresh, PlayArrow, Check, Close } from '@mui/icons-material';
import custodyService, { CustodyMaintenance as MaintenanceType, CustodyItem } from '../../services/custody.service';

const statusLabels: Record<string, string> = {
    PENDING: 'في انتظار الصيانة',
    IN_PROGRESS: 'جاري الصيانة',
    COMPLETED: 'مكتملة',
    CANNOT_REPAIR: 'لا يمكن إصلاحها',
};

const typeLabels: Record<string, string> = {
    PREVENTIVE: 'صيانة وقائية',
    CORRECTIVE: 'صيانة علاجية',
    EMERGENCY: 'صيانة طارئة',
};

export default function CustodyMaintenancePage() {
    const [loading, setLoading] = useState(true);
    const [maintenances, setMaintenances] = useState<MaintenanceType[]>([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [dialog, setDialog] = useState<{ open: boolean; mode: 'add' | 'update'; data: Partial<MaintenanceType> }>({ open: false, mode: 'add', data: {} });
    const [items, setItems] = useState<CustodyItem[]>([]);

    const fetchMaintenances = async () => {
        try {
            setLoading(true);
            const data = await custodyService.getMaintenances(statusFilter || undefined);
            setMaintenances(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchItems = async () => {
        try {
            const res = await custodyService.getItems({ limit: 100 });
            setItems(res.items);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { fetchItems(); }, []);
    useEffect(() => { fetchMaintenances(); }, [statusFilter]);

    const handleSave = async () => {
        try {
            if (dialog.mode === 'add') {
                await custodyService.createMaintenance(dialog.data);
            } else {
                await custodyService.updateMaintenance(dialog.data.id!, dialog.data);
            }
            setDialog({ open: false, mode: 'add', data: {} });
            fetchMaintenances();
        } catch (err: any) {
            alert(err.message || 'فشل في الحفظ');
        }
    };

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">🔧 صيانة العهد</Typography>
                <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>الحالة</InputLabel>
                        <Select value={statusFilter} label="الحالة" onChange={(e) => setStatusFilter(e.target.value)}>
                            <MenuItem value="">الكل</MenuItem>
                            {Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <IconButton onClick={fetchMaintenances}><Refresh /></IconButton>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ open: true, mode: 'add', data: { type: 'CORRECTIVE' } })}>طلب صيانة</Button>
                </Box>
            </Box>

            <Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell>العهدة</TableCell>
                                <TableCell>النوع</TableCell>
                                <TableCell>الوصف</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell>المزود</TableCell>
                                <TableCell>التكلفة المقدرة</TableCell>
                                <TableCell>التكلفة الفعلية</TableCell>
                                <TableCell align="center">إجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={30} /></TableCell></TableRow>
                            ) : maintenances.length === 0 ? (
                                <TableRow><TableCell colSpan={8} align="center">لا توجد طلبات صيانة</TableCell></TableRow>
                            ) : maintenances.map((m) => (
                                <TableRow key={m.id} hover>
                                    <TableCell><strong>{m.custodyItem?.name}</strong></TableCell>
                                    <TableCell><Chip size="small" label={typeLabels[m.type] || m.type} /></TableCell>
                                    <TableCell>{m.description}</TableCell>
                                    <TableCell><Chip size="small" label={statusLabels[m.status] || m.status} color={m.status === 'COMPLETED' ? 'success' : m.status === 'CANNOT_REPAIR' ? 'error' : 'warning'} /></TableCell>
                                    <TableCell>{m.vendor || '-'}</TableCell>
                                    <TableCell>{m.estimatedCost ? `${m.estimatedCost} ر.س` : '-'}</TableCell>
                                    <TableCell>{m.actualCost ? `${m.actualCost} ر.س` : '-'}</TableCell>
                                    <TableCell align="center">
                                        {m.status === 'PENDING' && <IconButton size="small" color="primary" onClick={() => setDialog({ open: true, mode: 'update', data: { ...m, status: 'IN_PROGRESS' } })}><PlayArrow /></IconButton>}
                                        {m.status === 'IN_PROGRESS' && (
                                            <>
                                                <IconButton size="small" color="success" onClick={() => setDialog({ open: true, mode: 'update', data: { ...m, status: 'COMPLETED' } })}><Check /></IconButton>
                                                <IconButton size="small" color="error" onClick={() => setDialog({ open: true, mode: 'update', data: { ...m, status: 'CANNOT_REPAIR' } })}><Close /></IconButton>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={dialog.open} onClose={() => setDialog({ ...dialog, open: false })} maxWidth="sm" fullWidth>
                <DialogTitle>{dialog.mode === 'add' ? '🔧 طلب صيانة جديد' : '📝 تحديث الصيانة'}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        {dialog.mode === 'add' && (
                            <>
                                <FormControl fullWidth>
                                    <InputLabel>العهدة *</InputLabel>
                                    <Select value={dialog.data.custodyItemId || ''} label="العهدة *" onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, custodyItemId: e.target.value } })}>
                                        {items.map((i) => <MenuItem key={i.id} value={i.id}>{i.name} ({i.code})</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth>
                                    <InputLabel>نوع الصيانة *</InputLabel>
                                    <Select value={dialog.data.type || 'CORRECTIVE'} label="نوع الصيانة *" onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, type: e.target.value as any } })}>
                                        {Object.entries(typeLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField label="وصف المشكلة *" multiline rows={3} value={dialog.data.description || ''} onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, description: e.target.value } })} />
                            </>
                        )}
                        <TextField label="المزود/الفني" value={dialog.data.vendor || ''} onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, vendor: e.target.value } })} />
                        <TextField label="رقم التواصل" value={dialog.data.vendorContact || ''} onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, vendorContact: e.target.value } })} />
                        <TextField label="التكلفة المقدرة" type="number" value={dialog.data.estimatedCost || ''} onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, estimatedCost: parseFloat(e.target.value) || undefined } })} />
                        {dialog.mode === 'update' && (
                            <>
                                <TextField label="التكلفة الفعلية" type="number" value={dialog.data.actualCost || ''} onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, actualCost: parseFloat(e.target.value) || undefined } })} />
                                <TextField label="نتيجة الصيانة" multiline rows={2} value={dialog.data.result || ''} onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, result: e.target.value } })} />
                                <TextField label="رقم الفاتورة" value={dialog.data.invoiceNumber || ''} onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, invoiceNumber: e.target.value } })} />
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialog({ ...dialog, open: false })}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSave}>حفظ</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
