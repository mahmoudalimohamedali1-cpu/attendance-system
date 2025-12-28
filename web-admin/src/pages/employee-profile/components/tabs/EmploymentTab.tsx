import { Box, Grid, Typography, Chip } from '@mui/material';
import { Work, Description } from '@mui/icons-material';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    teal: '#41B3A3',
    navy: '#2D3748',
    white: '#FFFFFF',
    yellow: '#F5C469',
    green: '#81C784',
};

interface EmploymentTabProps {
    profile: any;
}

// Info Card Component
const InfoCard = ({ title, icon, children, color }: { title: string; icon: React.ReactNode; children: React.ReactNode; color: string }) => (
    <Box
        sx={{
            bgcolor: theme.white,
            borderRadius: 4,
            p: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            height: '100%',
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${color}20` }}>
                {icon}
            </Box>
            <Typography variant="h6" fontWeight="bold" color={theme.navy}>
                {title}
            </Typography>
        </Box>
        {children}
    </Box>
);

// Info Row Component
const InfoRow = ({ label, value, isChip, chipColor }: { label: string; value: string | null | undefined; isChip?: boolean; chipColor?: string }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        {isChip ? (
            <Chip label={value || '-'} size="small" sx={{ bgcolor: chipColor || theme.coral, color: theme.white, fontWeight: 600 }} />
        ) : (
            <Typography variant="body2" fontWeight={600} color={theme.navy}>
                {value || '-'}
            </Typography>
        )}
    </Box>
);

export const EmploymentTab = ({ profile }: EmploymentTabProps) => {
    const p = profile as any;

    const formatDate = (date: string | Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getRoleLabel = (role: string) => {
        const roles: Record<string, string> = { ADMIN: 'مدير النظام', MANAGER: 'مدير', EMPLOYEE: 'موظف' };
        return roles[role] || role;
    };

    const getContractTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            PERMANENT: 'دائم',
            FIXED_TERM: 'محدد المدة',
            PART_TIME: 'دوام جزئي',
            SEASONAL: 'موسمي',
            PROBATION: 'فترة تجربة',
        };
        return types[type] || type;
    };

    const contract = p.contracts?.[0];

    return (
        <Grid container spacing={3}>
            {/* Current Position */}
            <Grid item xs={12} md={6}>
                <InfoCard title="الوظيفة الحالية" icon={<Work sx={{ color: theme.coral }} />} color={theme.coral}>
                    <InfoRow label="المسمى الوظيفي" value={p.jobTitleRef?.name || p.jobTitle} />
                    <InfoRow label="الدور في النظام" value={getRoleLabel(p.role)} isChip chipColor={p.role === 'ADMIN' ? theme.coral : theme.teal} />
                    <InfoRow label="الفرع" value={p.branch?.name} />
                    <InfoRow label="القسم" value={p.department?.name} />
                    <InfoRow label="المدير المباشر" value={p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : null} />
                    <InfoRow label="تاريخ التعيين" value={formatDate(p.hireDate)} />
                    <InfoRow label="كود الموظف" value={p.employeeCode} />
                </InfoCard>
            </Grid>

            {/* Current Contract */}
            <Grid item xs={12} md={6}>
                <InfoCard title="العقد الحالي" icon={<Description sx={{ color: theme.teal }} />} color={theme.teal}>
                    {contract ? (
                        <>
                            <InfoRow label="رقم العقد" value={contract.contractNumber} />
                            <InfoRow label="نوع العقد" value={getContractTypeLabel(contract.type)} isChip chipColor={theme.teal} />
                            <InfoRow label="تاريخ البداية" value={formatDate(contract.startDate)} />
                            <InfoRow label="تاريخ الانتهاء" value={formatDate(contract.endDate)} />
                            <InfoRow
                                label="حالة العقد"
                                value={contract.status === 'ACTIVE' ? 'ساري' : contract.status}
                                isChip
                                chipColor={contract.status === 'ACTIVE' ? theme.green : theme.coral}
                            />
                        </>
                    ) : (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                لا يوجد عقد مسجل
                            </Typography>
                        </Box>
                    )}
                </InfoCard>
            </Grid>
        </Grid>
    );
};

export default EmploymentTab;
