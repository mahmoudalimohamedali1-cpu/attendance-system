import { Box, Grid, Typography } from '@mui/material';
import { Person, Badge, Flight, ContactPhone } from '@mui/icons-material';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    peach: '#F9DCC4',
    teal: '#41B3A3',
    navy: '#2D3748',
    white: '#FFFFFF',
    yellow: '#F5C469',
};

interface PersonalInfoTabProps {
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
const InfoRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography variant="body2" fontWeight={600} color={theme.navy}>
            {value || '-'}
        </Typography>
    </Box>
);

export const PersonalInfoTab = ({ profile }: PersonalInfoTabProps) => {
    const p = profile as any;

    const formatDate = (date: string | Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getGender = (gender: string | null) => {
        if (!gender) return '-';
        return gender === 'MALE' ? 'ذكر' : 'أنثى';
    };

    const getMaritalStatus = (status: string | null) => {
        const statuses: Record<string, string> = {
            SINGLE: 'أعزب',
            MARRIED: 'متزوج',
            DIVORCED: 'مطلق',
            WIDOWED: 'أرمل',
        };
        return status ? statuses[status] || status : '-';
    };

    return (
        <Grid container spacing={3}>
            {/* Basic Info */}
            <Grid item xs={12} md={6}>
                <InfoCard title="البيانات الأساسية" icon={<Person sx={{ color: theme.coral }} />} color={theme.coral}>
                    <InfoRow label="الاسم الأول" value={p.firstName} />
                    <InfoRow label="اسم العائلة" value={p.lastName} />
                    <InfoRow label="البريد الإلكتروني" value={p.email} />
                    <InfoRow label="رقم الهاتف" value={p.phone} />
                    <InfoRow label="تاريخ الميلاد" value={formatDate(p.dateOfBirth)} />
                    <InfoRow label="الجنس" value={getGender(p.gender)} />
                    <InfoRow label="الحالة الاجتماعية" value={getMaritalStatus(p.maritalStatus)} />
                </InfoCard>
            </Grid>

            {/* Identity Documents */}
            <Grid item xs={12} md={6}>
                <InfoCard title="الهوية والإقامة" icon={<Badge sx={{ color: theme.teal }} />} color={theme.teal}>
                    {p.isSaudi ? (
                        <>
                            <InfoRow label="رقم الهوية الوطنية" value={p.nationalId} />
                            <InfoRow label="الجنسية" value="سعودي" />
                        </>
                    ) : (
                        <>
                            <InfoRow label="رقم الإقامة" value={p.iqamaNumber} />
                            <InfoRow label="تاريخ انتهاء الإقامة" value={formatDate(p.iqamaExpiryDate)} />
                            <InfoRow label="رقم الحدود" value={p.borderNumber} />
                            <InfoRow label="الجنسية" value={p.nationality} />
                        </>
                    )}
                    <InfoRow label="رمز المهنة" value={p.professionCode} />
                    <InfoRow label="المهنة" value={p.profession} />
                </InfoCard>
            </Grid>

            {/* Passport Info */}
            <Grid item xs={12} md={6}>
                <InfoCard title="بيانات جواز السفر" icon={<Flight sx={{ color: theme.yellow }} />} color={theme.yellow}>
                    <InfoRow label="رقم الجواز" value={p.passportNumber} />
                    <InfoRow label="تاريخ انتهاء الجواز" value={formatDate(p.passportExpiryDate)} />
                </InfoCard>
            </Grid>

            {/* Contact & Address */}
            <Grid item xs={12} md={6}>
                <InfoCard title="بيانات الاتصال" icon={<ContactPhone sx={{ color: theme.navy }} />} color={theme.navy}>
                    <InfoRow label="البريد الإلكتروني" value={p.email} />
                    <InfoRow label="رقم الهاتف" value={p.phone} />
                    <InfoRow label="رقم FCM" value={p.fcmToken ? 'مسجل' : 'غير مسجل'} />
                </InfoCard>
            </Grid>
        </Grid>
    );
};

export default PersonalInfoTab;
