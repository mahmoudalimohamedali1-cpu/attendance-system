import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Popper,
    ClickAwayListener,
} from '@mui/material';
import {
    Send as SendIcon,
    SmartToy as BotIcon,
    Person as PersonIcon,
    Refresh as RefreshIcon,
    AutoAwesome as SparkleIcon,
    Business as DeptIcon,
    Store as BranchIcon,
    Task as TaskIcon,
    Flag as GoalIcon,
} from '@mui/icons-material';
import { api } from '../../services/api.service';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface MentionItem {
    id: string;
    label: string;
    sublabel: string;
    value: string;
}

interface MentionResult {
    success: boolean;
    type: string;
    items: MentionItem[];
}

// كلمات مفتاحية لكشف السياق
const CONTEXT_KEYWORDS: Record<string, string[]> = {
    'employee': ['موظف', 'الموظف', 'موظفين', 'راتب', 'بيانات'],
    'department': ['قسم', 'القسم', 'اقسام'],
    'branch': ['فرع', 'الفرع', 'فروع'],
    'task': ['مهمة', 'المهمة', 'مهام'],
    'goal': ['هدف', 'الهدف', 'اهداف'],
};

const AiChatPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // @ Mention State
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionAnchor, setMentionAnchor] = useState<HTMLElement | null>(null);
    const [mentionItems, setMentionItems] = useState<MentionItem[]>([]);
    const [mentionLoading, setMentionLoading] = useState(false);
    const [mentionContext, setMentionContext] = useState('');
    const [mentionSearchStart, setMentionSearchStart] = useState(0);

    // جلب الاقتراحات عند التحميل
    useEffect(() => {
        fetchSuggestions();
        fetchHistory();
    }, []);

    // التمرير لآخر رسالة
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchSuggestions = async () => {
        try {
            const response = await api.get<{ success: boolean, suggestions: string[] }>('/ai-chat/suggestions');
            if (response.success) {
                setSuggestions(response.suggestions);
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await api.get<{ success: boolean, messages: Message[] }>('/ai-chat/history');
            if (response.success && response.messages.length > 0) {
                setMessages(response.messages);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    };

    // كشف السياق من النص الحالي
    const detectContext = useCallback((text: string): string => {
        const lowerText = text.toLowerCase();
        for (const [context, keywords] of Object.entries(CONTEXT_KEYWORDS)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    return context === 'employee' ? 'موظف' :
                        context === 'department' ? 'قسم' :
                            context === 'branch' ? 'فرع' :
                                context === 'task' ? 'مهمة' :
                                    context === 'goal' ? 'هدف' : 'موظف';
                }
            }
        }
        return 'موظف'; // Default to employee
    }, []);

    // جلب اقتراحات @ mentions
    const fetchMentions = useCallback(async (context: string, searchTerm: string) => {
        setMentionLoading(true);
        try {
            const response = await api.post<MentionResult>('/genius-ai/autocomplete', {
                context,
                searchTerm,
                limit: 8
            });
            if (response.success && response.items) {
                setMentionItems(response.items);
            } else {
                setMentionItems([]);
            }
        } catch (error) {
            console.error('Failed to fetch mentions:', error);
            setMentionItems([]);
        } finally {
            setMentionLoading(false);
        }
    }, []);

    // معالجة تغيير النص
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        setInput(newValue);

        console.log('[AI Chat] Input changed:', { newValue, cursorPos });

        // كشف @ في النص
        const textBeforeCursor = newValue.substring(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        console.log('[AI Chat] @ detection:', { atIndex, textBeforeCursor });

        if (atIndex !== -1) {
            // تحقق أن @ ليست في منتصف كلمة
            const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
            console.log('[AI Chat] charBefore @:', charBefore, 'charCode:', charBefore.charCodeAt(0));

            if (charBefore === ' ' || charBefore === '\n' || charBefore === '\t' || atIndex === 0) {
                const searchTerm = textBeforeCursor.substring(atIndex + 1);
                const context = detectContext(textBeforeCursor.substring(0, atIndex));

                console.log('[AI Chat] Opening mention dropdown:', { context, searchTerm });

                setMentionContext(context);
                setMentionSearchStart(atIndex);
                setMentionOpen(true);
                setMentionAnchor(inputRef.current);

                fetchMentions(context, searchTerm);
                return;
            }
        }

        setMentionOpen(false);
    }, [detectContext, fetchMentions]);

    // اختيار mention
    const handleSelectMention = useCallback((item: MentionItem) => {
        const beforeMention = input.substring(0, mentionSearchStart);
        const afterMention = input.substring(input.indexOf('@', mentionSearchStart) + 1);
        const afterSearchTerm = afterMention.includes(' ')
            ? afterMention.substring(afterMention.indexOf(' '))
            : '';

        const newValue = `${beforeMention}${item.value}${afterSearchTerm}`;
        setInput(newValue);
        setMentionOpen(false);
        setMentionItems([]);

        // Focus back on input
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [input, mentionSearchStart]);

    // إغلاق dropdown عند النقر خارجه
    const handleClickAway = useCallback(() => {
        setMentionOpen(false);
    }, []);

    // Icon حسب النوع
    const getMentionIcon = (context: string) => {
        switch (context) {
            case 'موظف': return <PersonIcon />;
            case 'قسم': return <DeptIcon />;
            case 'فرع': return <BranchIcon />;
            case 'مهمة': return <TaskIcon />;
            case 'هدف': return <GoalIcon />;
            default: return <PersonIcon />;
        }
    };

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
            const response = await api.post<{ success: boolean, response: string, suggestions?: string[] }>('/ai-chat/message', { message: text });

            if (response.success) {
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: response.response,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMessage]);

                if (response.suggestions) {
                    setSuggestions(response.suggestions);
                }
            }
        } catch (error: any) {
            const errorMessage: Message = {
                role: 'assistant',
                content: '❌ عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = async () => {
        try {
            await api.delete('/ai-chat/history');
            setMessages([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
            e.preventDefault();
            sendMessage(input);
        }
        // Arrow keys for mention navigation
        if (mentionOpen && (e.key === 'Escape')) {
            e.preventDefault();
            setMentionOpen(false);
        }
    };

    return (
        <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', p: 2 }}>
            {/* Header */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                            <BotIcon sx={{ color: 'white', fontSize: 28 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                                🤖 مساعد الموظفين الذكي
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                اكتب @ للإشارة لموظف، قسم، فرع...
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
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <SparkleIcon sx={{ fontSize: 64, color: '#667eea', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            أهلاً بك! كيف أقدر أساعدك؟
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            اختر من الاقتراحات أو اكتب سؤالك
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                            💡 نصيحة: اكتب @ للإشارة لموظف معين (مثل: راتب @محمد)
                        </Typography>

                        {/* Suggestions */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                            {suggestions.map((suggestion, index) => (
                                <Chip
                                    key={index}
                                    label={suggestion}
                                    onClick={() => sendMessage(suggestion)}
                                    sx={{
                                        bgcolor: 'white',
                                        border: '1px solid #667eea',
                                        color: '#667eea',
                                        '&:hover': {
                                            bgcolor: '#667eea',
                                            color: 'white',
                                        },
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
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
                                            maxWidth: '80%',
                                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                        }}
                                    >
                                        <Avatar
                                            sx={{
                                                bgcolor: msg.role === 'user' ? '#4caf50' : '#667eea',
                                                width: 36,
                                                height: 36,
                                            }}
                                        >
                                            {msg.role === 'user' ? <PersonIcon /> : <BotIcon />}
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
                                            >
                                                {msg.content}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                </Box>
                            </Fade>
                        ))}

                        {/* Loading indicator */}
                        {loading && (
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <Avatar sx={{ bgcolor: '#667eea', width: 36, height: 36 }}>
                                    <BotIcon />
                                </Avatar>
                                <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CircularProgress size={16} />
                                        <Typography variant="body2" color="text.secondary">
                                            جاري الكتابة...
                                        </Typography>
                                    </Box>
                                </Paper>
                            </Box>
                        )}

                        <div ref={messagesEndRef} />
                    </>
                )}
            </Paper>

            {/* Quick Suggestions (when there are messages) */}
            {messages.length > 0 && suggestions.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                        <Chip
                            key={index}
                            label={suggestion}
                            size="small"
                            onClick={() => sendMessage(suggestion)}
                            sx={{
                                bgcolor: 'white',
                                border: '1px solid #ddd',
                                '&:hover': { bgcolor: '#f5f5f5' },
                                cursor: 'pointer',
                            }}
                        />
                    ))}
                </Box>
            )}

            {/* Input Area */}
            <Paper elevation={3} sx={{ p: 2, borderRadius: 3, position: 'relative' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <TextField
                        fullWidth
                        multiline
                        maxRows={3}
                        placeholder="اكتب سؤالك هنا... (اكتب @ للإشارة لموظف)"
                        value={input}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        InputProps={{
                            inputRef: inputRef,
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                            },
                        }}
                    />
                    <IconButton
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || loading}
                        sx={{
                            bgcolor: '#667eea',
                            color: 'white',
                            width: 48,
                            height: 48,
                            '&:hover': { bgcolor: '#5a6fd6' },
                            '&:disabled': { bgcolor: '#ccc' },
                        }}
                    >
                        <SendIcon />
                    </IconButton>
                </Box>

                {/* @ Mention Dropdown */}
                <Popper
                    open={mentionOpen}
                    anchorEl={mentionAnchor}
                    placement="top-start"
                    style={{ zIndex: 1300 }}
                >
                    <ClickAwayListener onClickAway={handleClickAway}>
                        <Paper
                            elevation={8}
                            sx={{
                                width: 320,
                                maxHeight: 300,
                                overflow: 'auto',
                                mb: 1,
                                borderRadius: 2,
                            }}
                        >
                            {mentionLoading ? (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                    <CircularProgress size={24} />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        جاري البحث...
                                    </Typography>
                                </Box>
                            ) : mentionItems.length === 0 ? (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        لا توجد نتائج
                                    </Typography>
                                </Box>
                            ) : (
                                <List dense>
                                    {mentionItems.map((item, index) => (
                                        <ListItem
                                            key={item.id || index}
                                            button
                                            onClick={() => handleSelectMention(item)}
                                            sx={{
                                                '&:hover': {
                                                    bgcolor: '#f0f4ff',
                                                },
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: '#667eea', width: 32, height: 32 }}>
                                                    {getMentionIcon(mentionContext)}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={item.label}
                                                secondary={item.sublabel}
                                                primaryTypographyProps={{ fontWeight: 500 }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Paper>
                    </ClickAwayListener>
                </Popper>
            </Paper>
        </Box>
    );
};

export default AiChatPage;

