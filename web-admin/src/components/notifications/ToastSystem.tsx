import React, { createContext, useContext, useState, useCallback } from 'react';
import { Box, Typography, IconButton, LinearProgress, keyframes } from '@mui/material';
import { Close, CheckCircle, Error, Warning, Info } from '@mui/icons-material';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    progress?: boolean;
}

interface ToastContextType {
    showToast: (toast: Omit<Toast, 'id'>) => void;
    hideToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideOut = keyframes`
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
`;

const toastConfig = {
    success: {
        icon: <CheckCircle />,
        gradient: ['#22c55e', '#16a34a'],
        bgColor: '#dcfce7',
        borderColor: '#22c55e',
    },
    error: {
        icon: <Error />,
        gradient: ['#ef4444', '#dc2626'],
        bgColor: '#fee2e2',
        borderColor: '#ef4444',
    },
    warning: {
        icon: <Warning />,
        gradient: ['#f59e0b', '#d97706'],
        bgColor: '#fef3c7',
        borderColor: '#f59e0b',
    },
    info: {
        icon: <Info />,
        gradient: ['#3b82f6', '#2563eb'],
        bgColor: '#dbeafe',
        borderColor: '#3b82f6',
    },
};

/**
 * Single Toast Component
 */
const ToastItem: React.FC<{
    toast: Toast;
    onClose: () => void;
}> = ({ toast, onClose }) => {
    const config = toastConfig[toast.type];
    const [exiting, setExiting] = React.useState(false);

    React.useEffect(() => {
        const duration = toast.duration || 5000;
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [toast.duration, onClose]);

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                p: 2,
                pr: 1,
                minWidth: 320,
                maxWidth: 400,
                borderRadius: 2,
                bgcolor: config.bgColor,
                borderRight: `4px solid ${config.borderColor}`,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                animation: exiting
                    ? `${slideOut} 0.3s ease forwards`
                    : `${slideIn} 0.3s ease`,
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            {/* Icon */}
            <Box
                sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0,
                }}
            >
                {config.icon}
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                    {toast.title}
                </Typography>
                {toast.message && (
                    <Typography variant="caption" color="text.secondary">
                        {toast.message}
                    </Typography>
                )}
            </Box>

            {/* Close button */}
            <IconButton
                size="small"
                onClick={() => {
                    setExiting(true);
                    setTimeout(onClose, 300);
                }}
                sx={{ color: 'text.secondary' }}
            >
                <Close fontSize="small" />
            </IconButton>

            {/* Progress bar */}
            {toast.progress !== false && (
                <LinearProgress
                    variant="determinate"
                    value={100}
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        bgcolor: 'transparent',
                        '& .MuiLinearProgress-bar': {
                            bgcolor: config.borderColor,
                            animation: `shrink ${toast.duration || 5000}ms linear`,
                            '@keyframes shrink': {
                                from: { transform: 'translateX(0)' },
                                to: { transform: 'translateX(-100%)' },
                            },
                        },
                    }}
                />
            )}
        </Box>
    );
};

/**
 * Toast Provider Component
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { ...toast, id }]);
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const success = useCallback((title: string, message?: string) => {
        showToast({ type: 'success', title, message });
    }, [showToast]);

    const error = useCallback((title: string, message?: string) => {
        showToast({ type: 'error', title, message });
    }, [showToast]);

    const warning = useCallback((title: string, message?: string) => {
        showToast({ type: 'warning', title, message });
    }, [showToast]);

    const info = useCallback((title: string, message?: string) => {
        showToast({ type: 'info', title, message });
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, hideToast, success, error, warning, info }}>
            {children}

            {/* Toast container */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 24,
                    left: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    zIndex: 9999,
                }}
            >
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onClose={() => hideToast(toast.id)}
                    />
                ))}
            </Box>
        </ToastContext.Provider>
    );
};

/**
 * Hook to use toast notifications
 */
export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        // Return no-op implementation if used outside provider
        const noop = () => { };
        return {
            showToast: noop,
            hideToast: noop,
            success: noop,
            error: noop,
            warning: noop,
            info: noop,
        };
    }
    return context;
};

export default ToastProvider;
