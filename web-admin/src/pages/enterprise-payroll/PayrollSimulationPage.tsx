import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Paper,
    Divider,
    Chip,
    TextField,
    Slider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControlLabel,
    Switch,
} from '@mui/material';
import {
    Science as ScienceIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    PlayArrow as PlayIcon,
    History as HistoryIcon,
    Compare as CompareIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enterprisePayrollService } from '../../services/enterprise-payroll.service';

// Simulation Result Card
interface SimulationResultProps {
    result: {
        currentCost: number;
        projectedCost: number;
        difference: number;
        percentChange: number;
        affectedEmployees: number;
    };
}

const SimulationResultCard: React.FC<SimulationResultProps> = ({ result }) => {
    const isIncrease = result.difference > 0;

    return (
        <Paper sx={{ p: 3, bgcolor: isIncrease ? 'error.light' : 'success.light' }}>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                            التكلفة الحالية
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                            {result.currentCost.toLocaleString()} ر.س
                        </Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                            التكلفة المتوقعة
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                            {result.projectedCost.toLocaleString()} ر.س
                        </Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                            الفرق
                        </Typography>
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            {isIncrease ? (
                                <TrendingUpIcon color="error" />
                            ) : (
                                <TrendingDownIcon color="success" />
                            )}
                            <Typography variant="h5" fontWeight="bold" color={isIncrease ? 'error.main' : 'success.main'}>
                                {isIncrease ? '+' : ''}{result.difference.toLocaleString()} ر.س
                            </Typography>
                        </Box>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                            نسبة التغيير
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color={isIncrease ? 'error.main' : 'success.main'}>
                            {isIncrease ? '+' : ''}{result.percentChange.toFixed(1)}%
                        </Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                            الموظفين المتأثرين
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                            {result.affectedEmployees}
                        </Typography>
                    </Box>
                </Grid>
            </Grid>
        </Paper>
    );
};

// Scenario Card
interface ScenarioCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    color: string;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ title, description, icon, onClick, color }) => (
    <Card
        sx={{
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
            borderTop: `4px solid ${color}`,
        }}
        onClick={onClick}
    >
        <CardContent sx={{ textAlign: 'center' }}>
            <Box
                sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: `${color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                }}
            >
                {React.cloneElement(icon as React.ReactElement, { sx: { color, fontSize: 32 } })}
            </Box>
            <Typography variant="h6" fontWeight="bold">
                {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {description}
            </Typography>
        </CardContent>
    </Card>
);

// Salary Increase Dialog
interface SalaryIncreaseDialogProps {
    open: boolean;
    onClose: () => void;
    onRun: (params: any) => void;
    isRunning: boolean;
}

const SalaryIncreaseDialog: React.FC<SalaryIncreaseDialogProps> = ({ open, onClose, onRun, isRunning }) => {
    const [percentage, setPercentage] = useState(5);
    const [applyToAll, setApplyToAll] = useState(true);
    const [minSalary, setMinSalary] = useState(0);
    const [maxSalary, setMaxSalary] = useState(50000);

    const handleRun = () => {
        onRun({
            type: 'SALARY_INCREASE',
            parameters: {
                percentageIncrease: percentage,
                applyToAll,
                salaryRange: applyToAll ? null : { min: minSalary, max: maxSalary },
            },
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>محاكاة زيادة الرواتب</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                        نسبة الزيادة: {percentage}%
                    </Typography>
                    <Slider
                        value={percentage}
                        onChange={(_, v) => setPercentage(v as number)}
                        min={1}
                        max={30}
                        marks={[
                            { value: 5, label: '5%' },
                            { value: 10, label: '10%' },
                            { value: 15, label: '15%' },
                            { value: 20, label: '20%' },
                        ]}
                        sx={{ mb: 3 }}
                    />

                    <FormControlLabel
                        control={<Switch checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />}
                        label="تطبيق على جميع الموظفين"
                    />

                    {!applyToAll && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="الحد الأدنى للراتب"
                                    type="number"
                                    value={minSalary}
                                    onChange={(e) => setMinSalary(Number(e.target.value))}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="الحد الأقصى للراتب"
                                    type="number"
                                    value={maxSalary}
                                    onChange={(e) => setMaxSalary(Number(e.target.value))}
                                />
                            </Grid>
                        </Grid>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button
                    variant="contained"
                    onClick={handleRun}
                    disabled={isRunning}
                    startIcon={isRunning ? <CircularProgress size={20} /> : <PlayIcon />}
                >
                    تشغيل المحاكاة
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Headcount Change Dialog
interface HeadcountDialogProps {
    open: boolean;
    onClose: () => void;
    onRun: (params: any) => void;
    isRunning: boolean;
}

const HeadcountDialog: React.FC<HeadcountDialogProps> = ({ open, onClose, onRun, isRunning }) => {
    const [change, setChange] = useState(10);
    const [isIncrease, setIsIncrease] = useState(true);
    const [avgSalary, setAvgSalary] = useState(8000);

    const handleRun = () => {
        onRun({
            type: 'HEADCOUNT_CHANGE',
            parameters: {
                headcountChange: isIncrease ? change : -change,
                averageSalary: avgSalary,
            },
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>محاكاة تغيير عدد الموظفين</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                        control={<Switch checked={isIncrease} onChange={(e) => setIsIncrease(e.target.checked)} />}
                        label={isIncrease ? 'توظيف جديد' : 'تخفيض'}
                    />

                    <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
                        عدد الموظفين: {change}
                    </Typography>
                    <Slider
                        value={change}
                        onChange={(_, v) => setChange(v as number)}
                        min={1}
                        max={100}
                        marks={[
                            { value: 10, label: '10' },
                            { value: 25, label: '25' },
                            { value: 50, label: '50' },
                            { value: 100, label: '100' },
                        ]}
                        sx={{ mb: 3 }}
                    />

                    <TextField
                        fullWidth
                        label="متوسط الراتب للموظف الواحد"
                        type="number"
                        value={avgSalary}
                        onChange={(e) => setAvgSalary(Number(e.target.value))}
                        sx={{ mt: 2 }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button
                    variant="contained"
                    onClick={handleRun}
                    disabled={isRunning}
                    startIcon={isRunning ? <CircularProgress size={20} /> : <PlayIcon />}
                >
                    تشغيل المحاكاة
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Main Page Component
export const PayrollSimulationPage: React.FC = () => {
    const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
    const [headcountDialogOpen, setHeadcountDialogOpen] = useState(false);
    const [currentResult, setCurrentResult] = useState<any>(null);

    const queryClient = useQueryClient();

    const { data: history, isLoading: loadingHistory } = useQuery({
        queryKey: ['simulation-history'],
        queryFn: () => enterprisePayrollService.getSimulationHistory(),
    });

    const simulationMutation = useMutation({
        mutationFn: (params: { type: string; parameters: any }) =>
            enterprisePayrollService.runSimulation(params.type, params.parameters),
        onSuccess: (data) => {
            setCurrentResult(data);
            setSalaryDialogOpen(false);
            setHeadcountDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['simulation-history'] });
        },
    });

    const handleRunSimulation = (params: any) => {
        simulationMutation.mutate(params);
    };

    const scenarios = [
        {
            title: 'زيادة الرواتب',
            description: 'محاكاة تأثير زيادة الرواتب على التكاليف',
            icon: <TrendingUpIcon />,
            color: '#4caf50',
            onClick: () => setSalaryDialogOpen(true),
        },
        {
            title: 'تغيير عدد الموظفين',
            description: 'محاكاة توظيف أو تخفيض عدد الموظفين',
            icon: <PeopleIcon />,
            color: '#2196f3',
            onClick: () => setHeadcountDialogOpen(true),
        },
        {
            title: 'تغيير المزايا',
            description: 'محاكاة تغيير حزم المزايا',
            icon: <MoneyIcon />,
            color: '#ff9800',
            onClick: () => alert('قريباً'),
        },
        {
            title: 'مقارنة السيناريوهات',
            description: 'مقارنة عدة سيناريوهات مختلفة',
            icon: <CompareIcon />,
            color: '#9c27b0',
            onClick: () => alert('قريباً'),
        },
    ];

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <ScienceIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" fontWeight="bold">
                            محاكاة الرواتب
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            What-If Analysis & Scenario Planning
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Current Result */}
            {currentResult && (
                <Box mb={3}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                        تم تنفيذ المحاكاة بنجاح
                    </Alert>
                    <SimulationResultCard result={currentResult.results} />
                </Box>
            )}

            {/* Scenario Cards */}
            <Typography variant="h6" gutterBottom mb={2}>
                اختر سيناريو للمحاكاة
            </Typography>
            <Grid container spacing={3} mb={4}>
                {scenarios.map((scenario) => (
                    <Grid item xs={12} sm={6} md={3} key={scenario.title}>
                        <ScenarioCard {...scenario} />
                    </Grid>
                ))}
            </Grid>

            {/* Simulation History */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" display="flex" alignItems="center" gap={1} gutterBottom>
                    <HistoryIcon /> سجل المحاكاة
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {loadingHistory ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : history && history.length > 0 ? (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>التاريخ</TableCell>
                                    <TableCell>النوع</TableCell>
                                    <TableCell align="right">التكلفة الحالية</TableCell>
                                    <TableCell align="right">التكلفة المتوقعة</TableCell>
                                    <TableCell align="right">الفرق</TableCell>
                                    <TableCell align="center">التغيير</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {history.map((sim: any) => (
                                    <TableRow key={sim.id}>
                                        <TableCell>
                                            {new Date(sim.createdAt).toLocaleDateString('ar-SA')}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={
                                                    sim.type === 'SALARY_INCREASE'
                                                        ? 'زيادة رواتب'
                                                        : sim.type === 'HEADCOUNT_CHANGE'
                                                        ? 'تغيير عدد الموظفين'
                                                        : sim.type
                                                }
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            {sim.results.currentCost.toLocaleString()} ر.س
                                        </TableCell>
                                        <TableCell align="right">
                                            {sim.results.projectedCost.toLocaleString()} ر.س
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography
                                                color={sim.results.difference > 0 ? 'error.main' : 'success.main'}
                                            >
                                                {sim.results.difference > 0 ? '+' : ''}
                                                {sim.results.difference.toLocaleString()} ر.س
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                icon={
                                                    sim.results.percentChange > 0 ? (
                                                        <TrendingUpIcon />
                                                    ) : (
                                                        <TrendingDownIcon />
                                                    )
                                                }
                                                label={`${sim.results.percentChange > 0 ? '+' : ''}${sim.results.percentChange.toFixed(1)}%`}
                                                color={sim.results.percentChange > 0 ? 'error' : 'success'}
                                                size="small"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Alert severity="info">لا توجد محاكاة سابقة</Alert>
                )}
            </Paper>

            {/* Dialogs */}
            <SalaryIncreaseDialog
                open={salaryDialogOpen}
                onClose={() => setSalaryDialogOpen(false)}
                onRun={handleRunSimulation}
                isRunning={simulationMutation.isPending}
            />
            <HeadcountDialog
                open={headcountDialogOpen}
                onClose={() => setHeadcountDialogOpen(false)}
                onRun={handleRunSimulation}
                isRunning={simulationMutation.isPending}
            />
        </Box>
    );
};

export default PayrollSimulationPage;
