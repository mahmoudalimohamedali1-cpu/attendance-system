import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface AuditLogEntry {
    id: string;
    performedById: string;
    targetUserId: string;
    targetUserName: string;
    action: 'ADDED' | 'REMOVED' | 'MODIFIED';
    permissionCode: string;
    permissionName: string;
    scope: string | null;
    scopeDetails: string | null;
    createdAt: string;
}

const actionConfig = {
    ADDED: { icon: <AddIcon />, label: 'إضافة', color: 'success' },
    REMOVED: { icon: <RemoveIcon />, label: 'حذف', color: 'error' },
    MODIFIED: { icon: <EditIcon />, label: 'تعديل', color: 'warning' },
} as const;

const scopeLabels: Record<string, string> = {
    SELF: 'نفسه فقط',
    TEAM: 'الفريق',
    BRANCH: 'فرع',
    DEPARTMENT: 'قسم',
    ALL: 'الكل',
    CUSTOM: 'مخصص',
};

export const PermissionAuditPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAuditLog();
    }, []);

    const loadAuditLog = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<AuditLogEntry[]>('/permissions/audit');
            setLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading audit log:', err);
            setError('فشل في تحميل سجل التدقيق');
        }
        setLoading(false);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                سجل تدقيق الصلاحيات
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>التاريخ</TableCell>
                                <TableCell>الإجراء</TableCell>
                                <TableCell>الموظف المستهدف</TableCell>
                                <TableCell>الصلاحية</TableCell>
                                <TableCell>النطاق</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography color="text.secondary" sx={{ py: 4 }}>
                                            لا يوجد سجلات بعد
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id} hover>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatDate(log.createdAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={actionConfig[log.action].icon}
                                                label={actionConfig[log.action].label}
                                                color={actionConfig[log.action].color}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {log.targetUserName}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {log.permissionName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {log.permissionCode}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {log.scope && (
                                                <>
                                                    <Chip
                                                        label={scopeLabels[log.scope] || log.scope}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                    {log.scopeDetails && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {log.scopeDetails}
                                                        </Typography>
                                                    )}
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default PermissionAuditPage;
