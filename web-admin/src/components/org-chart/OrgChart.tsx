import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Box,
    Typography,
    Avatar,
    IconButton,
    Collapse,
    Paper,
    Chip,
    Tooltip,
    TextField,
    InputAdornment,
    Slider,
    Stack,
    Badge,
    Fade,
} from '@mui/material';
import {
    ExpandMore,
    ExpandLess,
    Email,
    Phone,
    Search,
    ZoomIn,
    ZoomOut,
    CenterFocusStrong,
    UnfoldMore,
    UnfoldLess,
    Person,
    Group,
    Business,
} from '@mui/icons-material';
import { GlassCard } from '@/components/premium';
import { useNavigate } from 'react-router-dom';

export interface OrgNode {
    id: string;
    name: string;
    jobTitle: string;
    department?: string;
    branch?: string;
    avatar?: string;
    email?: string;
    phone?: string;
    employeeCode?: string;
    status?: 'online' | 'offline' | 'busy' | 'away';
    employeesCount?: number;
    children?: OrgNode[];
}

interface OrgChartNodeProps {
    node: OrgNode;
    level?: number;
    onNodeClick?: (node: OrgNode) => void;
    expandedNodes: Set<string>;
    toggleNode: (id: string) => void;
    searchTerm?: string;
    highlightedNodes?: Set<string>;
}

// Premium color scheme for levels
const levelColors = [
    { primary: '#667eea', secondary: '#764ba2', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }, // CEO
    { primary: '#06b6d4', secondary: '#0891b2', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }, // Director
    { primary: '#22c55e', secondary: '#16a34a', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }, // Manager
    { primary: '#f59e0b', secondary: '#d97706', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }, // Team Lead
    { primary: '#8b5cf6', secondary: '#7c3aed', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }, // Senior
    { primary: '#94a3b8', secondary: '#64748b', gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' }, // Employee
];

const statusColors: Record<string, string> = {
    online: '#22c55e',
    busy: '#ef4444',
    away: '#f59e0b',
    offline: '#94a3b8',
};

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

/**
 * Premium Organization Chart Node with ZenHR-style design
 */
const OrgChartNode: React.FC<OrgChartNodeProps> = ({
    node,
    level = 0,
    onNodeClick,
    expandedNodes,
    toggleNode,
    searchTerm,
    highlightedNodes,
}) => {
    const navigate = useNavigate();
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const colors = levelColors[Math.min(level, levelColors.length - 1)];
    const isHighlighted = highlightedNodes?.has(node.id);
    const isVirtualRoot = node.id === 'company-root';

    const handleClick = () => {
        if (isVirtualRoot) return;
        if (onNodeClick) {
            onNodeClick(node);
        } else {
            navigate(`/employee-profile/${node.id}`);
        }
    };

    return (
        <Fade in timeout={300 + level * 100}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Node Card */}
                <Paper
                    elevation={isHighlighted ? 8 : 0}
                    sx={{
                        p: 2.5,
                        borderRadius: 4,
                        background: isVirtualRoot
                            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                            : `linear-gradient(135deg, ${colors.primary}08, ${colors.secondary}12)`,
                        border: isHighlighted
                            ? `3px solid ${colors.primary}`
                            : `2px solid ${colors.primary}25`,
                        minWidth: 240,
                        maxWidth: 280,
                        cursor: isVirtualRoot ? 'default' : 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'visible',
                        transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
                        '&:hover': isVirtualRoot
                            ? {}
                            : {
                                transform: 'translateY(-6px) scale(1.02)',
                                boxShadow: `0 12px 32px ${colors.primary}25`,
                                borderColor: colors.primary,
                            },
                        '&::before': isVirtualRoot
                            ? {}
                            : {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '4px',
                                background: colors.gradient,
                                borderRadius: '16px 16px 0 0',
                            },
                    }}
                    onClick={handleClick}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        {/* Avatar with status indicator */}
                        <Box sx={{ position: 'relative', flexShrink: 0 }}>
                            <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                badgeContent={
                                    node.status && !isVirtualRoot ? (
                                        <Box
                                            sx={{
                                                width: 14,
                                                height: 14,
                                                borderRadius: '50%',
                                                bgcolor: statusColors[node.status],
                                                border: '2px solid white',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                            }}
                                        />
                                    ) : null
                                }
                            >
                                <Avatar
                                    src={node.avatar}
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        background: isVirtualRoot
                                            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                                            : colors.gradient,
                                        fontSize: '1.1rem',
                                        fontWeight: 700,
                                        boxShadow: `0 4px 12px ${colors.primary}30`,
                                    }}
                                >
                                    {isVirtualRoot ? <Business /> : getInitials(node.name)}
                                </Avatar>
                            </Badge>
                        </Box>

                        {/* Info Section */}
                        <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
                            <Typography
                                variant="subtitle1"
                                fontWeight="bold"
                                noWrap
                                sx={{ color: isVirtualRoot ? 'white' : 'text.primary' }}
                            >
                                {node.name}
                            </Typography>
                            <Typography
                                variant="caption"
                                noWrap
                                sx={{
                                    color: isVirtualRoot ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                                    display: 'block',
                                    mb: 1,
                                }}
                            >
                                {node.jobTitle}
                            </Typography>

                            {/* Department & Branch Chips */}
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                                {node.department && (
                                    <Chip
                                        label={node.department}
                                        size="small"
                                        sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            bgcolor: `${colors.primary}15`,
                                            color: isVirtualRoot ? 'white' : colors.primary,
                                            fontWeight: 600,
                                            border: `1px solid ${colors.primary}30`,
                                        }}
                                    />
                                )}
                                {node.employeeCode && !isVirtualRoot && (
                                    <Chip
                                        label={node.employeeCode}
                                        size="small"
                                        icon={<Person sx={{ fontSize: '0.75rem !important' }} />}
                                        sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            bgcolor: 'rgba(0,0,0,0.05)',
                                            fontWeight: 500,
                                        }}
                                    />
                                )}
                            </Stack>
                        </Box>

                        {/* Expand Button & Team Count */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            {hasChildren && (
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleNode(node.id);
                                    }}
                                    sx={{
                                        background: colors.gradient,
                                        color: 'white',
                                        width: 32,
                                        height: 32,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                            boxShadow: `0 4px 12px ${colors.primary}40`,
                                        },
                                    }}
                                >
                                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                            )}
                            {(node.employeesCount ?? 0) > 0 && (
                                <Tooltip title={`${node.employeesCount} مرؤوسين`}>
                                    <Chip
                                        icon={<Group sx={{ fontSize: '0.8rem !important' }} />}
                                        label={node.employeesCount}
                                        size="small"
                                        sx={{
                                            height: 22,
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            bgcolor: `${colors.primary}20`,
                                            color: colors.primary,
                                        }}
                                    />
                                </Tooltip>
                            )}
                        </Box>
                    </Box>

                    {/* Quick Actions */}
                    {!isVirtualRoot && (
                        <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center', pt: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                            {node.email && (
                                <Tooltip title={node.email}>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = `mailto:${node.email}`;
                                        }}
                                        sx={{
                                            bgcolor: '#dbeafe',
                                            color: '#2563eb',
                                            '&:hover': { bgcolor: '#bfdbfe' },
                                        }}
                                    >
                                        <Email fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {node.phone && (
                                <Tooltip title={node.phone}>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = `tel:${node.phone}`;
                                        }}
                                        sx={{
                                            bgcolor: '#dcfce7',
                                            color: '#16a34a',
                                            '&:hover': { bgcolor: '#bbf7d0' },
                                        }}
                                    >
                                        <Phone fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    )}
                </Paper>

                {/* Connection Lines */}
                {hasChildren && isExpanded && (
                    <>
                        {/* Vertical connector from parent */}
                        <Box
                            sx={{
                                width: 3,
                                height: 32,
                                background: `linear-gradient(to bottom, ${colors.primary}, ${colors.primary}50)`,
                                borderRadius: 2,
                            }}
                        />

                        {/* Horizontal connector for multiple children */}
                        {node.children!.length > 1 && (
                            <Box
                                sx={{
                                    height: 3,
                                    width: `calc(${(node.children!.length - 1) * 280}px + ${(node.children!.length - 1) * 24}px)`,
                                    maxWidth: '90vw',
                                    background: `linear-gradient(to right, transparent, ${colors.primary}, transparent)`,
                                    borderRadius: 2,
                                }}
                            />
                        )}
                    </>
                )}

                {/* Children */}
                <Collapse in={isExpanded} timeout={400}>
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 3,
                            mt: 2,
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                        }}
                    >
                        {node.children?.map((child) => (
                            <Box key={child.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {/* Vertical connector to child */}
                                {node.children!.length > 1 && (
                                    <Box
                                        sx={{
                                            width: 3,
                                            height: 16,
                                            bgcolor: colors.primary,
                                            opacity: 0.5,
                                            borderRadius: 2,
                                            mb: 1,
                                        }}
                                    />
                                )}
                                <OrgChartNode
                                    node={child}
                                    level={level + 1}
                                    onNodeClick={onNodeClick}
                                    expandedNodes={expandedNodes}
                                    toggleNode={toggleNode}
                                    searchTerm={searchTerm}
                                    highlightedNodes={highlightedNodes}
                                />
                            </Box>
                        ))}
                    </Box>
                </Collapse>
            </Box>
        </Fade>
    );
};

interface EnhancedOrgChartProps {
    data: OrgNode | null;
    onNodeClick?: (node: OrgNode) => void;
    loading?: boolean;
}

/**
 * Premium Interactive Organization Chart - ZenHR Style
 * Features: Zoom, Pan, Search, Expand/Collapse All
 */
export const EnhancedOrgChart: React.FC<EnhancedOrgChartProps> = ({ data, onNodeClick, loading }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [scale, setScale] = useState(0.9);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());

    // Initialize with root expanded
    useEffect(() => {
        if (data) {
            setExpandedNodes(new Set([data.id]));
        }
    }, [data]);

    const toggleNode = useCallback((id: string) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const getAllIds = useCallback((node: OrgNode): string[] => {
        const ids = [node.id];
        node.children?.forEach((child) => ids.push(...getAllIds(child)));
        return ids;
    }, []);

    const expandAll = () => {
        if (data) {
            setExpandedNodes(new Set(getAllIds(data)));
        }
    };

    const collapseAll = () => {
        if (data) {
            setExpandedNodes(new Set([data.id]));
        }
    };

    const resetView = () => {
        setScale(0.9);
        setSearchTerm('');
        setHighlightedNodes(new Set());
        if (data) {
            setExpandedNodes(new Set([data.id]));
        }
    };

    // Search functionality
    const searchNodes = useCallback((node: OrgNode, term: string): string[] => {
        const matches: string[] = [];
        const termLower = term.toLowerCase();

        if (
            node.name.toLowerCase().includes(termLower) ||
            node.employeeCode?.toLowerCase().includes(termLower) ||
            node.department?.toLowerCase().includes(termLower) ||
            node.jobTitle.toLowerCase().includes(termLower)
        ) {
            matches.push(node.id);
        }

        node.children?.forEach((child) => {
            matches.push(...searchNodes(child, term));
        });

        return matches;
    }, []);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        if (term && data) {
            const matches = searchNodes(data, term);
            setHighlightedNodes(new Set(matches));
            // Expand path to all matches
            if (matches.length > 0) {
                setExpandedNodes(new Set(getAllIds(data)));
            }
        } else {
            setHighlightedNodes(new Set());
        }
    };

    // Mouse wheel zoom
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            setScale((prev) => Math.min(1.5, Math.max(0.4, prev + delta)));
        }
    };

    if (loading) {
        return (
            <GlassCard sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">جاري تحميل الهيكل التنظيمي...</Typography>
            </GlassCard>
        );
    }

    if (!data) {
        return (
            <GlassCard sx={{ p: 4, textAlign: 'center' }}>
                <Business sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">لا يوجد موظفين في الهيكل التنظيمي</Typography>
            </GlassCard>
        );
    }

    return (
        <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
            {/* Header Controls */}
            <Box
                sx={{
                    p: 2,
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                    background: 'linear-gradient(to right, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Business sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold">
                        الهيكل التنظيمي
                    </Typography>
                    {highlightedNodes.size > 0 && (
                        <Chip
                            label={`${highlightedNodes.size} نتيجة`}
                            size="small"
                            color="primary"
                            onDelete={() => handleSearch('')}
                        />
                    )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <TextField
                        size="small"
                        placeholder="بحث بالاسم أو الكود..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        sx={{ width: 220 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Zoom Controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 2, px: 1 }}>
                        <IconButton size="small" onClick={() => setScale((prev) => Math.max(0.4, prev - 0.1))}>
                            <ZoomOut fontSize="small" />
                        </IconButton>
                        <Slider
                            value={scale}
                            min={0.4}
                            max={1.5}
                            step={0.05}
                            onChange={(_, v) => setScale(v as number)}
                            sx={{ width: 80, mx: 1 }}
                            size="small"
                        />
                        <IconButton size="small" onClick={() => setScale((prev) => Math.min(1.5, prev + 0.1))}>
                            <ZoomIn fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
                            {Math.round(scale * 100)}%
                        </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Tooltip title="توسيع الكل">
                        <IconButton onClick={expandAll} size="small" sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
                            <UnfoldMore fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="طي الكل">
                        <IconButton onClick={collapseAll} size="small" sx={{ bgcolor: 'grey.200' }}>
                            <UnfoldLess fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="إعادة تعيين العرض">
                        <IconButton onClick={resetView} size="small" sx={{ bgcolor: 'grey.200' }}>
                            <CenterFocusStrong fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Chart Container */}
            <Box
                ref={containerRef}
                onWheel={handleWheel}
                sx={{
                    overflow: 'auto',
                    p: 4,
                    minHeight: 500,
                    maxHeight: 'calc(100vh - 300px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    background: 'radial-gradient(circle at center, rgba(102, 126, 234, 0.03) 0%, transparent 70%)',
                }}
            >
                <Box
                    sx={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.2s ease-out',
                        minWidth: 'fit-content',
                    }}
                >
                    <OrgChartNode
                        node={data}
                        onNodeClick={onNodeClick}
                        expandedNodes={expandedNodes}
                        toggleNode={toggleNode}
                        searchTerm={searchTerm}
                        highlightedNodes={highlightedNodes}
                    />
                </Box>
            </Box>
        </GlassCard>
    );
};

export default EnhancedOrgChart;
