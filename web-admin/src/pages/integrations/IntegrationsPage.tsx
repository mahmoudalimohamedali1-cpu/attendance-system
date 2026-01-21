import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Grid, Card, CardContent, IconButton, Button, Chip, Switch,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormGroup, FormControlLabel,
    Checkbox, Alert, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Tooltip, CircularProgress, Snackbar, Divider, Avatar, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
    Add as AddIcon, Delete as DeleteIcon, PlayArrow as TestIcon, Refresh as RefreshIcon,
    Link as LinkIcon, LinkOff as DisconnectIcon, ContentCopy as CopyIcon, CheckCircle, Error,
    Settings as WebhookIcon, CloudSync as SyncIcon, Download as ImportIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi, Webhook, WebhookEvent, Integration, AvailableIntegration } from '../../services/integrations.service';

// ============ Main Page ============

export default function IntegrationsPage() {
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
                🔗 التكاملات والـ Webhooks
            </Typography>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
                    <Tab icon={<WebhookIcon />} label="Webhooks" />
                    <Tab icon={<SyncIcon />} label="التكاملات الخارجية" />
                    <Tab icon={<ImportIcon />} label="استيراد البيانات" />
                </Tabs>
            </Paper>

            {tab === 0 && <WebhooksTab />}
            {tab === 1 && <IntegrationsTab />}
            {tab === 2 && <ImportTab />}
        </Box>
    );
}

// ============ Webhooks Tab ============

function WebhooksTab() {
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: [] as string[] });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const { data: webhooks, isLoading } = useQuery({
        queryKey: ['webhooks'],
        queryFn: () => integrationsApi.getWebhooks(),
    });

    const { data: events } = useQuery({
        queryKey: ['webhook-events'],
        queryFn: () => integrationsApi.getWebhookEvents(),
    });

    const createMutation = useMutation({
        mutationFn: integrationsApi.createWebhook,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] });
            setCreateOpen(false);
            setNewWebhook({ name: '', url: '', events: [] });
            setSnackbar({ open: true, message: `تم إنشاء الـ Webhook. Secret: ${data.secret?.substring(0, 20)}...`, severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل إنشاء الـ Webhook', severity: 'error' }),
    });

    const deleteMutation = useMutation({
        mutationFn: integrationsApi.deleteWebhook,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] });
            setSnackbar({ open: true, message: 'تم حذف الـ Webhook', severity: 'success' });
        },
    });

    const testMutation = useMutation({
        mutationFn: integrationsApi.testWebhook,
        onSuccess: (data) => setSnackbar({ open: true, message: data.message, severity: data.success ? 'success' : 'error' }),
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => integrationsApi.updateWebhook(id, { isActive }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
    });

    const handleEventToggle = (event: string) => {
        setNewWebhook(prev => ({
            ...prev,
            events: prev.events.includes(event)
                ? prev.events.filter(e => e !== event)
                : [...prev.events, event],
        }));
    };

    const groupedEvents = React.useMemo(() => {
        if (!events) return {};
        return (events as WebhookEvent[]).reduce((acc, e) => {
            if (!acc[e.category]) acc[e.category] = [];
            acc[e.category].push(e);
            return acc;
        }, {} as Record<string, WebhookEvent[]>);
    }, [events]);

    if (isLoading) return <CircularProgress />;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">🔗 الـ Webhooks المسجلة</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                    إضافة Webhook
                </Button>
            </Box>

            {(!webhooks || webhooks.length === 0) ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <WebhookIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">لا يوجد Webhooks</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        أضف Webhook لإرسال إشعارات تلقائية لأي URL عند حدوث أحداث معينة
                    </Typography>
                    <Button variant="outlined" onClick={() => setCreateOpen(true)}>إضافة أول Webhook</Button>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>الاسم</TableCell>
                                <TableCell>URL</TableCell>
                                <TableCell>الأحداث</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell>آخر إرسال</TableCell>
                                <TableCell>إجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(webhooks as Webhook[]).map((webhook) => (
                                <TableRow key={webhook.id}>
                                    <TableCell>
                                        <Typography fontWeight="bold">{webhook.name}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <Tooltip title={webhook.url}><span>{webhook.url}</span></Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {webhook.events.slice(0, 3).map(e => (
                                                <Chip key={e} label={e} size="small" variant="outlined" />
                                            ))}
                                            {webhook.events.length > 3 && (
                                                <Chip label={`+${webhook.events.length - 3}`} size="small" />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={webhook.isActive}
                                            onChange={() => toggleMutation.mutate({ id: webhook.id, isActive: !webhook.isActive })}
                                            color="success"
                                        />
                                        {webhook.failureCount > 0 && (
                                            <Chip label={`${webhook.failureCount} فشل`} color="error" size="small" sx={{ ml: 1 }} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {webhook.lastTriggeredAt
                                            ? new Date(webhook.lastTriggeredAt).toLocaleString('ar')
                                            : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title="اختبار">
                                            <IconButton onClick={() => testMutation.mutate(webhook.id)} color="primary" size="small">
                                                <TestIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="حذف">
                                            <IconButton onClick={() => deleteMutation.mutate(webhook.id)} color="error" size="small">
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>➕ إضافة Webhook جديد</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth label="اسم الـ Webhook" value={newWebhook.name}
                        onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <TextField
                        fullWidth label="URL" placeholder="https://example.com/webhook"
                        value={newWebhook.url}
                        onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                        sx={{ mb: 3 }}
                    />
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>اختر الأحداث:</Typography>
                    {Object.entries(groupedEvents).map(([category, categoryEvents]) => (
                        <Box key={category} sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                {category}
                            </Typography>
                            <FormGroup row>
                                {categoryEvents.map((event) => (
                                    <FormControlLabel
                                        key={event.event}
                                        control={
                                            <Checkbox
                                                checked={newWebhook.events.includes(event.event)}
                                                onChange={() => handleEventToggle(event.event)}
                                            />
                                        }
                                        label={`${event.event} - ${event.description}`}
                                    />
                                ))}
                            </FormGroup>
                        </Box>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => createMutation.mutate(newWebhook)}
                        disabled={!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
                    >
                        إنشاء
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}

// ============ Integrations Tab ============

function IntegrationsTab() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [connectDialog, setConnectDialog] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const [teamsData, setTeamsData] = useState({ webhookUrl: '', channelName: '' });
    const [jiraData, setJiraData] = useState({ jiraUrl: '', email: '', apiToken: '' });
    const [trelloData, setTrelloData] = useState({ apiKey: '', token: '' });

    const { data, isLoading, error } = useQuery({
        queryKey: ['integrations'],
        queryFn: () => integrationsApi.getIntegrations(),
    });

    const disconnectMutation = useMutation({
        mutationFn: integrationsApi.disconnectIntegration,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
            setSnackbar({ open: true, message: 'تم فصل التكامل', severity: 'success' });
        },
    });

    const connectTeamsMutation = useMutation({
        mutationFn: integrationsApi.connectTeams,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
            setConnectDialog(null);
            setSnackbar({ open: true, message: 'تم ربط Microsoft Teams', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل ربط Teams', severity: 'error' }),
    });

    const connectJiraMutation = useMutation({
        mutationFn: integrationsApi.connectJira,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
            setConnectDialog(null);
            setSnackbar({ open: true, message: 'تم ربط Jira', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل ربط Jira', severity: 'error' }),
    });

    const connectTrelloMutation = useMutation({
        mutationFn: integrationsApi.connectTrello,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
            setConnectDialog(null);
            setSnackbar({ open: true, message: 'تم ربط Trello', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل ربط Trello', severity: 'error' }),
    });

    // Default integrations list
    const defaultIntegrations: AvailableIntegration[] = [
        { type: 'odoo', name: 'Odoo ERP', icon: '🟣', description: 'مزامنة الموظفين والحضور والإجازات والرواتب', isConnected: false },
        { type: 'slack', name: 'Slack', icon: '💬', description: 'إشعارات فورية وأوامر المهام', isConnected: false },
        { type: 'teams', name: 'Microsoft Teams', icon: '🟦', description: 'بطاقات تكيفية وإشعارات', isConnected: false },
        { type: 'github', name: 'GitHub', icon: '🐙', description: 'ربط المهام بالـ Issues', isConnected: false },
        { type: 'gitlab', name: 'GitLab', icon: '🦊', description: 'ربط المهام بالـ Issues', isConnected: false },
        { type: 'jira', name: 'Jira', icon: '📊', description: 'استيراد وتصدير المهام', isConnected: false },
        { type: 'trello', name: 'Trello', icon: '📋', description: 'استيراد اللوحات والبطاقات', isConnected: false },
    ];

    const integrationIcons: Record<string, string> = {
        odoo: '🟣', slack: '💬', teams: '🟦', github: '🐙', gitlab: '🦊', jira: '📊', trello: '📋', google: '🔗', zapier: '⚡',
    };

    // Use API data or default list
    const availableIntegrations = (data?.available && data.available.length > 0)
        ? data.available
        : defaultIntegrations.map(d => ({
            ...d,
            isConnected: data?.connected?.some((c: Integration) => c.type === d.type) || false,
        }));

    if (isLoading) return <CircularProgress />;

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>🔌 التكاملات الخارجية</Typography>

            {error && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    لم يتم تحميل التكاملات من الخادم - عرض القائمة الافتراضية
                </Alert>
            )}

            <Grid container spacing={3}>
                {availableIntegrations.map((integration: AvailableIntegration) => (
                    <Grid item xs={12} sm={6} md={4} key={integration.type}>
                        <Card sx={{ height: '100%', opacity: integration.isConnected ? 1 : 0.8, border: integration.isConnected ? '2px solid #4caf50' : 'none' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h3" sx={{ mr: 2 }}>{integrationIcons[integration.type] || integration.icon}</Typography>
                                    <Box>
                                        <Typography variant="h6">{integration.name}</Typography>
                                        {integration.isConnected && (
                                            <Chip icon={<CheckCircle />} label="متصل" color="success" size="small" />
                                        )}
                                    </Box>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {integration.description}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    {integration.isConnected ? (
                                        <Button
                                            variant="outlined" color="error" size="small"
                                            startIcon={<DisconnectIcon />}
                                            onClick={() => disconnectMutation.mutate(integration.type)}
                                        >
                                            فصل
                                        </Button>
                                    ) : integration.type === 'odoo' || integration.type === 'ODOO' ? (
                                        <Button
                                            variant="contained" size="small" color="secondary"
                                            startIcon={<LinkIcon />}
                                            onClick={() => navigate('/settings/odoo')}
                                        >
                                            إعدادات Odoo
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="contained" size="small"
                                            startIcon={<LinkIcon />}
                                            onClick={() => setConnectDialog(integration.type)}
                                        >
                                            ربط
                                        </Button>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Teams Connect Dialog */}
            <Dialog open={connectDialog === 'teams'} onClose={() => setConnectDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>🟦 ربط Microsoft Teams</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        أنشئ Incoming Webhook في Teams واحصل على الرابط
                    </Alert>
                    <TextField
                        fullWidth label="Webhook URL" placeholder="https://outlook.office.com/webhook/..."
                        value={teamsData.webhookUrl}
                        onChange={(e) => setTeamsData({ ...teamsData, webhookUrl: e.target.value })}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <TextField
                        fullWidth label="اسم القناة (اختياري)"
                        value={teamsData.channelName}
                        onChange={(e) => setTeamsData({ ...teamsData, channelName: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConnectDialog(null)}>إلغاء</Button>
                    <Button variant="contained" onClick={() => connectTeamsMutation.mutate(teamsData)} disabled={!teamsData.webhookUrl}>
                        ربط
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Jira Connect Dialog */}
            <Dialog open={connectDialog === 'jira'} onClose={() => setConnectDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>📊 ربط Jira</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth label="Jira URL" placeholder="https://yourcompany.atlassian.net"
                        value={jiraData.jiraUrl}
                        onChange={(e) => setJiraData({ ...jiraData, jiraUrl: e.target.value })}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <TextField
                        fullWidth label="Email"
                        value={jiraData.email}
                        onChange={(e) => setJiraData({ ...jiraData, email: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth label="API Token" type="password"
                        value={jiraData.apiToken}
                        onChange={(e) => setJiraData({ ...jiraData, apiToken: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConnectDialog(null)}>إلغاء</Button>
                    <Button variant="contained" onClick={() => connectJiraMutation.mutate(jiraData)}>ربط</Button>
                </DialogActions>
            </Dialog>

            {/* Trello Connect Dialog */}
            <Dialog open={connectDialog === 'trello'} onClose={() => setConnectDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>📋 ربط Trello</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        احصل على API Key و Token من <a href="https://trello.com/power-ups/admin" target="_blank" rel="noreferrer">Trello Power-Ups</a>
                    </Alert>
                    <TextField
                        fullWidth label="API Key"
                        value={trelloData.apiKey}
                        onChange={(e) => setTrelloData({ ...trelloData, apiKey: e.target.value })}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <TextField
                        fullWidth label="Token"
                        value={trelloData.token}
                        onChange={(e) => setTrelloData({ ...trelloData, token: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConnectDialog(null)}>إلغاء</Button>
                    <Button variant="contained" onClick={() => connectTrelloMutation.mutate(trelloData)}>ربط</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}

// ============ Import Tab ============

function ImportTab() {
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [jiraImport, setJiraImport] = useState({ projectKey: '', jiraUrl: '' });
    const [trelloImport, setTrelloImport] = useState({ boardId: '' });

    const { data: integrations } = useQuery({
        queryKey: ['integrations'],
        queryFn: () => integrationsApi.getIntegrations(),
    });

    const { data: trelloBoards } = useQuery({
        queryKey: ['trello-boards'],
        queryFn: () => integrationsApi.getTrelloBoards(),
        enabled: integrations?.connected.some((i: Integration) => i.type === 'trello'),
    });

    const jiraImportMutation = useMutation({
        mutationFn: integrationsApi.importFromJira,
        onSuccess: (data) => setSnackbar({ open: true, message: `تم استيراد ${data.imported} مهمة من ${data.total}`, severity: 'success' }),
        onError: () => setSnackbar({ open: true, message: 'فشل الاستيراد', severity: 'error' }),
    });

    const trelloImportMutation = useMutation({
        mutationFn: integrationsApi.importFromTrello,
        onSuccess: (data) => setSnackbar({ open: true, message: `تم استيراد ${data.imported} مهمة من لوحة ${data.boardName}`, severity: 'success' }),
        onError: () => setSnackbar({ open: true, message: 'فشل الاستيراد', severity: 'error' }),
    });

    const isJiraConnected = integrations?.connected.some((i: Integration) => i.type === 'jira');
    const isTrelloConnected = integrations?.connected.some((i: Integration) => i.type === 'trello');

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>📥 استيراد البيانات</Typography>

            <Grid container spacing={3}>
                {/* Jira Import */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>📊 استيراد من Jira</Typography>
                        {!isJiraConnected ? (
                            <Alert severity="warning">يجب ربط Jira أولاً من تبويب "التكاملات الخارجية"</Alert>
                        ) : (
                            <>
                                <TextField
                                    fullWidth label="Jira URL" placeholder="https://yourcompany.atlassian.net"
                                    value={jiraImport.jiraUrl}
                                    onChange={(e) => setJiraImport({ ...jiraImport, jiraUrl: e.target.value })}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth label="Project Key" placeholder="PROJ"
                                    value={jiraImport.projectKey}
                                    onChange={(e) => setJiraImport({ ...jiraImport, projectKey: e.target.value })}
                                    sx={{ mb: 2 }}
                                />
                                <Button
                                    variant="contained" startIcon={<ImportIcon />}
                                    onClick={() => jiraImportMutation.mutate(jiraImport)}
                                    disabled={jiraImportMutation.isPending || !jiraImport.projectKey || !jiraImport.jiraUrl}
                                >
                                    {jiraImportMutation.isPending ? 'جاري الاستيراد...' : 'استيراد'}
                                </Button>
                            </>
                        )}
                    </Paper>
                </Grid>

                {/* Trello Import */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>📋 استيراد من Trello</Typography>
                        {!isTrelloConnected ? (
                            <Alert severity="warning">يجب ربط Trello أولاً من تبويب "التكاملات الخارجية"</Alert>
                        ) : (
                            <>
                                <TextField
                                    fullWidth select label="اختر لوحة" SelectProps={{ native: true }}
                                    value={trelloImport.boardId}
                                    onChange={(e) => setTrelloImport({ boardId: e.target.value })}
                                    sx={{ mb: 2 }}
                                >
                                    <option value="">اختر لوحة...</option>
                                    {trelloBoards?.map((board: any) => (
                                        <option key={board.id} value={board.id}>{board.name}</option>
                                    ))}
                                </TextField>
                                <Button
                                    variant="contained" startIcon={<ImportIcon />}
                                    onClick={() => trelloImportMutation.mutate(trelloImport)}
                                    disabled={trelloImportMutation.isPending || !trelloImport.boardId}
                                >
                                    {trelloImportMutation.isPending ? 'جاري الاستيراد...' : 'استيراد'}
                                </Button>
                            </>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
