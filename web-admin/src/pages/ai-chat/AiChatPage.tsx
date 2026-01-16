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
    Divider,
} from '@mui/material';
import {
    Send as SendIcon,
    SmartToy as BotIcon,
    Person as PersonIcon,
    Refresh as RefreshIcon,
    AutoAwesome as SparkleIcon,
} from '@mui/icons-material';
import { api } from '../../services/api.service';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const AiChatPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
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
                                اسألني أي شيء عن الحضور، الإجازات، الراتب...
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
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            اختر من الاقتراحات أو اكتب سؤالك
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
            <Paper elevation={3} sx={{ p: 2, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <TextField
                        fullWidth
                        multiline
                        maxRows={3}
                        placeholder="اكتب سؤالك هنا..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
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
            </Paper>
        </Box>
    );
};

export default AiChatPage;
