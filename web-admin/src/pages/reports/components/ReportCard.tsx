/**
 * ReportCard Component
 * Displays a single report as a clickable card
 */

import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    PictureAsPdf,
    TableChart,
    Description,
} from '@mui/icons-material';
import { ReportDefinition } from '../reportDefinitions';

interface ReportCardProps {
    report: ReportDefinition;
    onView: (report: ReportDefinition) => void;
    onExportPdf?: (report: ReportDefinition) => void;
    onExportExcel?: (report: ReportDefinition) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({
    report,
    onView,
    onExportPdf,
    onExportExcel,
}) => {
    const IconComponent = report.icon;

    const getAccessLevelLabel = (level: string) => {
        switch (level) {
            case 'ALL': return 'الجميع';
            case 'MANAGER': return 'المدراء';
            case 'ADMIN': return 'المسؤولين';
            default: return level;
        }
    };

    const getAccessLevelColor = (level: string) => {
        switch (level) {
            case 'ALL': return 'success';
            case 'MANAGER': return 'warning';
            case 'ADMIN': return 'error';
            default: return 'default';
        }
    };

    return (
        <Card
            sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: '1px solid #f0f0f0',
                borderRadius: 3,
                '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: `0 10px 30px ${report.color}20`,
                    borderColor: report.color,
                },
            }}
            onClick={() => onView(report)}
        >
            <CardContent sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                        sx={{
                            width: 50,
                            height: 50,
                            borderRadius: 3,
                            bgcolor: `${report.color}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <IconComponent sx={{ fontSize: 28, color: report.color }} />
                    </Box>
                    <Chip
                        label={getAccessLevelLabel(report.accessLevel)}
                        size="small"
                        color={getAccessLevelColor(report.accessLevel) as any}
                        sx={{ fontSize: 11, height: 22 }}
                    />
                </Box>

                {/* Title & Description */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, lineHeight: 1.3 }}>
                    {report.name}
                </Typography>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: 40,
                    }}
                >
                    {report.description}
                </Typography>

                {/* Export Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    {report.exportFormats.includes('pdf') && (
                        <Tooltip title="تصدير PDF">
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onExportPdf?.(report);
                                }}
                                sx={{
                                    bgcolor: '#f44336',
                                    color: 'white',
                                    '&:hover': { bgcolor: '#d32f2f' },
                                    width: 32,
                                    height: 32,
                                }}
                            >
                                <PictureAsPdf sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {report.exportFormats.includes('excel') && (
                        <Tooltip title="تصدير Excel">
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onExportExcel?.(report);
                                }}
                                sx={{
                                    bgcolor: '#4caf50',
                                    color: 'white',
                                    '&:hover': { bgcolor: '#388e3c' },
                                    width: 32,
                                    height: 32,
                                }}
                            >
                                <TableChart sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {report.exportFormats.includes('csv') && (
                        <Tooltip title="تصدير CSV">
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onExportExcel?.(report);
                                }}
                                sx={{
                                    bgcolor: '#2196f3',
                                    color: 'white',
                                    '&:hover': { bgcolor: '#1976d2' },
                                    width: 32,
                                    height: 32,
                                }}
                            >
                                <Description sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default ReportCard;
