import React, { useState, useCallback } from 'react';
import { Box, Typography, Avatar, IconButton, Collapse, Paper, Chip, Tooltip } from '@mui/material';
import { ExpandMore, ExpandLess, Email, Phone, Person } from '@mui/icons-material';
import { GlassCard, PulseIndicator } from '@/components/premium';

interface OrgNode {
    id: string;
    name: string;
    jobTitle: string;
    department?: string;
    avatar?: string;
    email?: string;
    phone?: string;
    status?: 'online' | 'offline' | 'busy' | 'away';
    children?: OrgNode[];
}

interface OrgChartNodeProps {
    node: OrgNode;
    level?: number;
    onNodeClick?: (node: OrgNode) => void;
    expandedNodes: Set<string>;
    toggleNode: (id: string) => void;
}

const levelColors = [
    ['#667eea', '#764ba2'], // CEO level
    ['#06b6d4', '#0891b2'], // Director level
    ['#22c55e', '#16a34a'], // Manager level
    ['#f59e0b', '#d97706'], // Team lead level
    ['#94a3b8', '#64748b'], // Employee level
];

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

/**
 * Individual Organization Chart Node
 */
const OrgChartNode: React.FC<OrgChartNodeProps> = ({
    node,
    level = 0,
    onNodeClick,
    expandedNodes,
    toggleNode,
}) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const colors = levelColors[Math.min(level, levelColors.length - 1)];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Node card */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${colors[0]}10, ${colors[1]}10)`,
                    border: `2px solid ${colors[0]}30`,
                    minWidth: 200,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 8px 24px ${colors[0]}20`,
                        borderColor: colors[0],
                    },
                }}
                onClick={() => onNodeClick?.(node)}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Avatar with status */}
                    <Box sx={{ position: 'relative' }}>
                        <Avatar
                            src={node.avatar}
                            sx={{
                                width: 48,
                                height: 48,
                                background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                                fontSize: '1rem',
                                fontWeight: 600,
                            }}
                        >
                            {getInitials(node.name)}
                        </Avatar>
                        {node.status && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    bgcolor: node.status === 'online' ? '#22c55e' : node.status === 'busy' ? '#ef4444' : '#94a3b8',
                                    border: '2px solid white',
                                }}
                            />
                        )}
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight="bold" noWrap>
                            {node.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {node.jobTitle}
                        </Typography>
                        {node.department && (
                            <Chip
                                label={node.department}
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: '0.6rem',
                                    mt: 0.5,
                                    bgcolor: `${colors[0]}20`,
                                    color: colors[0],
                                    fontWeight: 600,
                                }}
                            />
                        )}
                    </Box>

                    {/* Expand button */}
                    {hasChildren && (
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleNode(node.id);
                            }}
                            sx={{
                                bgcolor: colors[0],
                                color: 'white',
                                width: 28,
                                height: 28,
                                '&:hover': { bgcolor: colors[1] },
                            }}
                        >
                            {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        </IconButton>
                    )}
                </Box>

                {/* Quick contact */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center' }}>
                    {node.email && (
                        <Tooltip title={node.email}>
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = `mailto:${node.email}`;
                                }}
                                sx={{ bgcolor: '#dbeafe', color: '#2563eb' }}
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
                                sx={{ bgcolor: '#dcfce7', color: '#16a34a' }}
                            >
                                <Phone fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Paper>

            {/* Connector line */}
            {hasChildren && isExpanded && (
                <>
                    <Box
                        sx={{
                            width: 2,
                            height: 24,
                            bgcolor: colors[0],
                            opacity: 0.3,
                        }}
                    />

                    {/* Horizontal connector for multiple children */}
                    {node.children!.length > 1 && (
                        <Box
                            sx={{
                                height: 2,
                                width: `${(node.children!.length - 1) * 220}px`,
                                bgcolor: colors[0],
                                opacity: 0.3,
                            }}
                        />
                    )}
                </>
            )}

            {/* Children */}
            <Collapse in={isExpanded}>
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
                        <OrgChartNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onNodeClick={onNodeClick}
                            expandedNodes={expandedNodes}
                            toggleNode={toggleNode}
                        />
                    ))}
                </Box>
            </Collapse>
        </Box>
    );
};

interface OrgChartProps {
    data: OrgNode;
    onNodeClick?: (node: OrgNode) => void;
}

/**
 * Premium Interactive Organization Chart
 * Zoomable, expandable org tree with status indicators
 */
export const OrgChart: React.FC<OrgChartProps> = ({ data, onNodeClick }) => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([data.id]));
    const [scale, setScale] = useState(1);

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

    const expandAll = () => {
        const getAllIds = (node: OrgNode): string[] => {
            const ids = [node.id];
            node.children?.forEach((child) => ids.push(...getAllIds(child)));
            return ids;
        };
        setExpandedNodes(new Set(getAllIds(data)));
    };

    const collapseAll = () => {
        setExpandedNodes(new Set([data.id]));
    };

    return (
        <GlassCard sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h6" fontWeight="bold">
                    🏢 الهيكل التنظيمي
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                        label="توسيع الكل"
                        size="small"
                        onClick={expandAll}
                        sx={{ cursor: 'pointer', fontWeight: 600 }}
                    />
                    <Chip
                        label="طي الكل"
                        size="small"
                        onClick={collapseAll}
                        sx={{ cursor: 'pointer', fontWeight: 600 }}
                    />
                    <Chip
                        label={`${Math.round(scale * 100)}%`}
                        size="small"
                        sx={{ fontWeight: 600 }}
                    />
                </Box>
            </Box>

            {/* Chart */}
            <Box
                sx={{
                    overflow: 'auto',
                    py: 4,
                    minHeight: 400,
                    display: 'flex',
                    justifyContent: 'center',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.3s ease',
                }}
            >
                <OrgChartNode
                    node={data}
                    onNodeClick={onNodeClick}
                    expandedNodes={expandedNodes}
                    toggleNode={toggleNode}
                />
            </Box>
        </GlassCard>
    );
};

export default OrgChart;
