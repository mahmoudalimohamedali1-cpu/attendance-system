import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Typography,
    Avatar,
    Chip,
    CircularProgress,
    Fade,
    Card,
    CardContent,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    AlertTitle,
    Tooltip,
    Button,
    Divider,
    Badge,
    Skeleton,
} from '@mui/material';
import {
    Send as SendIcon,
    SmartToy as BotIcon,
    Person as PersonIcon,
    Refresh as RefreshIcon,
    AutoAwesome as SparkleIcon,
    Psychology as PsychologyIcon,
    TrendingUp as TrendingIcon,
    Schedule as ScheduleIcon,
    People as PeopleIcon,
    BeachAccess as BeachIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    CheckCircle as CheckIcon,
    Error as ErrorIcon,
    Lightbulb as LightbulbIcon,
    TableChart as TableIcon,
    BarChart as ChartIcon,
    Today as TodayIcon,
    ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { api } from '../../services/api.service';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from 'recharts';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    data?: any;
    visualization?: 'text' | 'table' | 'chart' | 'card' | 'list';
    chartType?: 'bar' | 'pie' | 'line';
    insights?: Insight[];
    actions?: QuickAction[];
    processingTime?: number;
}

interface Insight {
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
    action?: string;
}

interface QuickAction {
    label: string;
    command: string;
    icon?: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

interface DashboardStat {
    label: string;
    value: string | number;
    icon: string;
    color: string;
}

const CHART_COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

const GeniusAiPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<{ text: string; icon: string }[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch dashboard data
    const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
        queryKey: ['genius-dashboard'],
        queryFn: async () => api.get<any>('/genius-ai/dashboard'),
        refetchInterval: 60000, // Refresh every minute
    });

    // Fetch suggestions
    const { data: suggestionsData } = useQuery({
        queryKey: ['genius-suggestions'],
        queryFn: async () => api.get<any>('/genius-ai/suggestions'),
    });

    useEffect(() => {
        if (suggestionsData?.suggestions) {
            setSuggestions(suggestionsData.suggestions);
        }
    }, [suggestionsData]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMessage: Message = {
            role: 'user',
            content: text,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await api.post<any>('/genius-ai/chat', { message: text });

            if (response.success) {
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: response.message,
                    timestamp: new Date(),
                    data: response.data,
                    visualization: response.visualization,
                    chartType: response.chartType,
                    insights: response.insights,
                    actions: response.actions,
                    processingTime: response.processingTime,
                };
                setMessages(prev => [...prev, assistantMessage]);

                if (response.suggestions) {
                    setSuggestions(response.suggestions.map((s: string) => ({ text: s, icon: 'auto_awesome' })));
                }
            }
        } catch (error: any) {
            const errorMessage: Message = {
                role: 'assistant',
                content: '❌ عذراً، حدث خطأ في الاتصال بالمساعد الذكي.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = async () => {
        try {
            await api.delete('/genius-ai/history');
            setMessages([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const renderDataVisualization = (msg: Message) => {
        if (!msg.data) return null;

        switch (msg.visualization) {
            case 'table':
                return renderTable(msg.data);
            case 'chart':
                return renderChart(msg.data, msg.chartType);
            case 'card':
                return renderCard(msg.data);
            case 'list':
                return renderList(msg.data);
            default:
                return null;
        }
    };

    const renderTable = (data: any[]) => {
        if (!Array.isArray(data) || data.length === 0) return null;
        const headers = Object.keys(data[0]);

        return (
            <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            {headers.map(header => (
                                <TableCell key={header} sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>
                                    {header.replace(/_/g, ' ')}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.slice(0, 15).map((row, i) => (
                            <TableRow key={i} hover>
                                {headers.map(header => (
                                    <TableCell key={header}>{row[header]}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderChart = (data: any, type?: string) => {
        let chartData = Array.isArray(data) ? data : data?.chartData || [];
        if (chartData.length === 0) return null;

        return (
            <Box sx={{ mt: 2, height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'pie' ? (
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                                {chartData.map((_: any, index: number) => (
                                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                    ) : type === 'line' ? (
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={Object.keys(chartData[0])[0]} />
                            <YAxis />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey={Object.keys(chartData[0])[1]} stroke="#667eea" strokeWidth={2} />
                        </LineChart>
                    ) : (
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={Object.keys(chartData[0])[0]} />
                            <YAxis />
                            <RechartsTooltip />
                            <Bar dataKey={Object.keys(chartData[0])[1]} fill="#667eea" />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </Box>
        );
    };

    const renderCard = (data: any) => {
        if (!data) return null;

        return (
            <Card sx={{ mt: 2, bgcolor: '#667eea', color: 'white' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" sx={{ fontWeight: 'bold' }}>
                        {data.count || data.value || JSON.stringify(data)}
                    </Typography>
                </CardContent>
            </Card>
        );
    };

    const renderList = (data: any) => {
        if (!data || typeof data !== 'object') return null;

        return (
            <Box sx={{ mt: 2 }}>
                {Object.entries(data).map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                        <Typography color="text.secondary">{key.replace(/_/g, ' ')}:</Typography>
                        <Typography fontWeight="medium">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </Typography>
                    </Box>
                ))}
            </Box>
        );
    };

    const renderInsights = (insights: Insight[]) => {
        if (!insights || insights.length === 0) return null;

        return (
            <Box sx={{ mt: 2 }}>
                {insights.map((insight, i) => (
                    <Alert
                        key={i}
                        severity={insight.type}
                        sx={{ mb: 1 }}
                        action={
                            insight.action && (
                                <Button size="small" onClick={() => sendMessage(insight.action!)}>
                                    {insight.action}
                                </Button>
                            )
                        }
                    >
                        <AlertTitle>{insight.title}</AlertTitle>
                        {insight.message}
                    </Alert>
                ))}
            </Box>
        );
    };

    const renderQuickActions = (actions: QuickAction[]) => {
        if (!actions || actions.length === 0) return null;

        return (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {actions.map((action, i) => (
                    <Button
                        key={i}
                        variant="outlined"
                        size="small"
                        color={action.color || 'primary'}
                        onClick={() => sendMessage(action.command)}
                    >
                        {action.label}
                    </Button>
                ))}
            </Box>
        );
    };

    const getStatIcon = (icon: string) => {
        switch (icon) {
            case 'people': return <PeopleIcon />;
            case 'schedule': return <ScheduleIcon />;
            case 'pending': return <ScheduleIcon />;
            case 'notification_important': return <WarningIcon />;
            default: return <InfoIcon />;
        }
    };

    return (
        <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', gap: 2, p: 2 }}>
            {/* Main Chat Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mb: 2,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 3,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                                <PsychologyIcon sx={{ color: 'white', fontSize: 32 }} />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    🧠 المساعد الذكي GENIUS
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    مدعوم بالذكاء الاصطناعي المتقدم - اسأل أي شيء!
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton onClick={clearChat} sx={{ color: 'white' }} title="محادثة جديدة">
                            <RefreshIcon />
                        </IconButton>
                    </Box>
                </Paper>

                {/* Messages Area */}
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1,
                        overflow: 'auto',
                        p: 2,
                        mb: 2,
                        bgcolor: '#f8f9fa',
                        borderRadius: 3,
                    }}
                >
                    {messages.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <SparkleIcon sx={{ fontSize: 80, color: '#667eea', mb: 2 }} />
                            <Typography variant="h5" color="text.secondary" gutterBottom>
                                أهلاً بك في المساعد الذكي! 🚀
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                                يمكنني مساعدتك في استعلامات البيانات، التحليلات، والإجراءات
                            </Typography>

                            {/* Quick Start Grid */}
                            <Grid container spacing={2} sx={{ maxWidth: 800, mx: 'auto' }}>
                                {[
                                    { text: 'ملخص اليوم', icon: <TodayIcon />, color: '#667eea', category: 'استعلام' },
                                    { text: 'تقرير الحضور', icon: <ScheduleIcon />, color: '#764ba2', category: 'استعلام' },
                                    { text: 'طلبات الإجازات المعلقة', icon: <BeachIcon />, color: '#f093fb', category: 'استعلام' },
                                    { text: 'رؤى ذكية', icon: <LightbulbIcon />, color: '#f5576c', category: 'تحليل' },
                                    { text: 'أضف موظف جديد', icon: <PeopleIcon />, color: '#4caf50', category: 'إجراء' },
                                    { text: 'أضف مهمة جديدة', icon: <CheckIcon />, color: '#2196f3', category: 'إجراء' },
                                    { text: 'ارسل إشعار للكل', icon: <WarningIcon />, color: '#ff9800', category: 'إجراء' },
                                    { text: 'تعرف على إمكانياتي', icon: <SparkleIcon />, color: '#9c27b0', category: 'مساعدة' },
                                ].map((item, i) => (
                                    <Grid item xs={6} md={3} key={i}>
                                        <Paper
                                            onClick={() => sendMessage(item.text)}
                                            sx={{
                                                p: 2,
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.2s',
                                                position: 'relative',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: 4,
                                                    bgcolor: item.color,
                                                    color: 'white',
                                                    '& .MuiSvgIcon-root': { color: 'white' },
                                                },
                                            }}
                                        >
                                            <Chip
                                                label={item.category}
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 4,
                                                    right: 4,
                                                    fontSize: '0.6rem',
                                                    height: 18,
                                                    bgcolor: 'rgba(0,0,0,0.1)'
                                                }}
                                            />
                                            <Box sx={{ color: item.color, mb: 1, mt: 1 }}>{item.icon}</Box>
                                            <Typography variant="body2" fontWeight="medium">
                                                {item.text}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Interactive Command Examples */}
                            <Box sx={{ mt: 4, maxWidth: 700, mx: 'auto' }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    💡 جرب أوامر مثل:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                                    {[
                                        'عدل راتب أحمد إلى 10000',
                                        'وافق على إجازة محمد',
                                        'أضف مكافأة 1000 لسارة',
                                        'انقل خالد لقسم IT',
                                        'أضف عهدة لابتوب',
                                        'كم موظف عندنا؟',
                                    ].map((cmd, i) => (
                                        <Chip
                                            key={i}
                                            label={cmd}
                                            onClick={() => sendMessage(cmd)}
                                            sx={{
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: '#667eea',
                                                    color: 'white',
                                                    transform: 'scale(1.05)'
                                                },
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    ) : (
                        <>
                            {messages.map((msg, index) => (
                                <Fade in key={index}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            mb: 2,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 1,
                                                maxWidth: '85%',
                                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                            }}
                                        >
                                            <Avatar
                                                sx={{
                                                    bgcolor: msg.role === 'user' ? '#4caf50' : '#667eea',
                                                    width: 40,
                                                    height: 40,
                                                }}
                                            >
                                                {msg.role === 'user' ? <PersonIcon /> : <PsychologyIcon />}
                                            </Avatar>
                                            <Paper
                                                elevation={1}
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 3,
                                                    bgcolor: msg.role === 'user' ? '#4caf50' : 'white',
                                                    color: msg.role === 'user' ? 'white' : 'inherit',
                                                }}
                                            >
                                                <Typography
                                                    variant="body1"
                                                    sx={{ whiteSpace: 'pre-wrap' }}
                                                    dangerouslySetInnerHTML={{
                                                        __html: msg.content
                                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                            .replace(/\n/g, '<br />'),
                                                    }}
                                                />

                                                {/* Data Visualization */}
                                                {msg.role === 'assistant' && renderDataVisualization(msg)}

                                                {/* Insights */}
                                                {msg.role === 'assistant' && renderInsights(msg.insights || [])}

                                                {/* Quick Actions */}
                                                {msg.role === 'assistant' && renderQuickActions(msg.actions || [])}

                                                {/* Processing Time */}
                                                {msg.role === 'assistant' && msg.processingTime && (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ display: 'block', mt: 1, textAlign: 'left' }}
                                                    >
                                                        ⚡ {msg.processingTime}ms
                                                    </Typography>
                                                )}

                                                {/* Copy button for assistant messages */}
                                                {msg.role === 'assistant' && (
                                                    <Tooltip title="نسخ">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => copyToClipboard(msg.content)}
                                                            sx={{ mt: 1 }}
                                                        >
                                                            <CopyIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Paper>
                                        </Box>
                                    </Box>
                                </Fade>
                            ))}

                            {/* Loading indicator */}
                            {loading && (
                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    <Avatar sx={{ bgcolor: '#667eea', width: 40, height: 40 }}>
                                        <PsychologyIcon />
                                    </Avatar>
                                    <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircularProgress size={20} />
                                            <Typography variant="body2" color="text.secondary">
                                                جاري التفكير...
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Box>
                            )}

                            <div ref={messagesEndRef} />
                        </>
                    )}
                </Paper>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        {suggestions.slice(0, 5).map((suggestion, index) => (
                            <Chip
                                key={index}
                                label={typeof suggestion === 'string' ? suggestion : suggestion.text}
                                onClick={() => sendMessage(typeof suggestion === 'string' ? suggestion : suggestion.text)}
                                sx={{
                                    bgcolor: 'white',
                                    border: '1px solid #667eea',
                                    color: '#667eea',
                                    '&:hover': { bgcolor: '#667eea', color: 'white' },
                                    cursor: 'pointer',
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* Input Area */}
                <Paper elevation={3} sx={{ p: 2, borderRadius: 3 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                        <TextField
                            fullWidth
                            multiline
                            maxRows={3}
                            placeholder="اسأل أي شيء... مثال: كم عدد الموظفين؟ أو حلل الحضور"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={loading}
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: 3 },
                            }}
                        />
                        <IconButton
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || loading}
                            sx={{
                                bgcolor: '#667eea',
                                color: 'white',
                                width: 56,
                                height: 56,
                                '&:hover': { bgcolor: '#5a6fd6' },
                                '&:disabled': { bgcolor: '#ccc' },
                            }}
                        >
                            <SendIcon />
                        </IconButton>
                    </Box>
                </Paper>
            </Box>

            {/* Side Panel - Dashboard */}
            <Paper sx={{ width: 320, p: 2, borderRadius: 3, display: { xs: 'none', lg: 'block' } }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingIcon color="primary" /> لوحة المؤشرات
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {/* Stats */}
                {dashboardLoading ? (
                    <Box>
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 2 }} />
                        ))}
                    </Box>
                ) : dashboardData?.stats ? (
                    <Grid container spacing={1}>
                        {dashboardData.stats.map((stat: DashboardStat, i: number) => (
                            <Grid item xs={6} key={i}>
                                <Card
                                    sx={{
                                        bgcolor: stat.color === 'error' ? '#ffebee' :
                                            stat.color === 'warning' ? '#fff8e1' :
                                                stat.color === 'success' ? '#e8f5e9' : '#e3f2fd',
                                    }}
                                >
                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {getStatIcon(stat.icon)}
                                            <Box>
                                                <Typography variant="h6" sx={{ lineHeight: 1 }}>
                                                    {stat.value}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {stat.label}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                ) : null}

                {/* Quick Actions */}
                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, color: 'text.secondary' }}>
                    إجراءات سريعة
                </Typography>
                {dashboardData?.quickActions?.map((action: any, i: number) => (
                    <Button
                        key={i}
                        fullWidth
                        variant="outlined"
                        size="small"
                        onClick={() => sendMessage(action.label)}
                        sx={{ mb: 0.5, justifyContent: 'flex-start' }}
                    >
                        {action.label}
                    </Button>
                ))}

                {/* Recent Activity */}
                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, color: 'text.secondary' }}>
                    النشاط الأخير
                </Typography>
                {dashboardData?.recentActivity?.slice(0, 3).map((activity: any, i: number) => (
                    <Box key={i} sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            {new Date(activity.time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {activity.description}
                        </Typography>
                    </Box>
                ))}
            </Paper>
        </Box>
    );
};

export default GeniusAiPage;
