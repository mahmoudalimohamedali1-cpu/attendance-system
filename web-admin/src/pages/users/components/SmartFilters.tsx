import React from 'react';
import { Box, Chip, TextField, InputAdornment, Select, MenuItem, FormControl, IconButton, Tooltip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Search, FilterList, ViewList, ViewModule, Close, Save, Bookmark } from '@mui/icons-material';
import { GlassCard } from '@/components/premium';

interface SmartFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    filters: {
        status?: string;
        role?: string;
        department?: string;
        branch?: string;
    };
    onFilterChange: (key: string, value: string) => void;
    viewMode: 'table' | 'cards';
    onViewModeChange: (mode: 'table' | 'cards') => void;
    departments?: { id: string; name: string }[];
    branches?: { id: string; name: string }[];
}

const statusOptions = [
    { value: '', label: 'جميع الحالات' },
    { value: 'ACTIVE', label: 'نشط' },
    { value: 'INACTIVE', label: 'غير نشط' },
    { value: 'SUSPENDED', label: 'موقوف' },
];

const roleOptions = [
    { value: '', label: 'جميع الأدوار' },
    { value: 'ADMIN', label: 'مدير النظام' },
    { value: 'HR', label: 'موارد بشرية' },
    { value: 'MANAGER', label: 'مدير' },
    { value: 'EMPLOYEE', label: 'موظف' },
];

/**
 * Premium Smart Filters Component
 * Advanced filtering with saved presets
 */
export const SmartFilters: React.FC<SmartFiltersProps> = ({
    search,
    onSearchChange,
    filters,
    onFilterChange,
    viewMode,
    onViewModeChange,
    departments = [],
    branches = [],
}) => {
    const activeFiltersCount = Object.values(filters).filter(Boolean).length;

    const handleClearFilters = () => {
        Object.keys(filters).forEach((key) => {
            onFilterChange(key, '');
        });
        onSearchChange('');
    };

    return (
        <GlassCard sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <TextField
                    placeholder="بحث عن موظف..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    size="small"
                    sx={{
                        minWidth: 280,
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.8)',
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,1)',
                            },
                        },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                        endAdornment: search && (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => onSearchChange('')}>
                                    <Close fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                {/* Status Filter */}
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                        value={filters.status || ''}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                        displayEmpty
                        sx={{
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.8)',
                            '& .MuiSelect-select': {
                                py: 1,
                            },
                        }}
                    >
                        {statusOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Role Filter */}
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                        value={filters.role || ''}
                        onChange={(e) => onFilterChange('role', e.target.value)}
                        displayEmpty
                        sx={{
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.8)',
                            '& .MuiSelect-select': {
                                py: 1,
                            },
                        }}
                    >
                        {roleOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Department Filter */}
                {departments.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                            value={filters.department || ''}
                            onChange={(e) => onFilterChange('department', e.target.value)}
                            displayEmpty
                            sx={{
                                borderRadius: 2,
                                bgcolor: 'rgba(255,255,255,0.8)',
                            }}
                        >
                            <MenuItem value="">جميع الأقسام</MenuItem>
                            {departments.map((dept) => (
                                <MenuItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {/* Spacer */}
                <Box sx={{ flex: 1 }} />

                {/* Clear filters */}
                {activeFiltersCount > 0 && (
                    <Chip
                        label={`مسح الفلاتر (${activeFiltersCount})`}
                        onDelete={handleClearFilters}
                        size="small"
                        sx={{
                            bgcolor: '#fee2e2',
                            color: '#dc2626',
                            fontWeight: 600,
                            '& .MuiChip-deleteIcon': {
                                color: '#dc2626',
                            },
                        }}
                    />
                )}

                {/* View mode toggle */}
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, value) => value && onViewModeChange(value)}
                    size="small"
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.8)',
                        borderRadius: 2,
                        '& .MuiToggleButton-root': {
                            border: 'none',
                            borderRadius: '8px !important',
                            px: 1.5,
                            '&.Mui-selected': {
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: 'primary.dark',
                                },
                            },
                        },
                    }}
                >
                    <ToggleButton value="table">
                        <Tooltip title="عرض جدول">
                            <ViewList fontSize="small" />
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="cards">
                        <Tooltip title="عرض بطاقات">
                            <ViewModule fontSize="small" />
                        </Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Active filters chips */}
            {activeFiltersCount > 0 && (
                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                    {filters.status && (
                        <Chip
                            label={`الحالة: ${statusOptions.find(o => o.value === filters.status)?.label}`}
                            onDelete={() => onFilterChange('status', '')}
                            size="small"
                            sx={{
                                bgcolor: '#dbeafe',
                                color: '#1e40af',
                                fontWeight: 500,
                            }}
                        />
                    )}
                    {filters.role && (
                        <Chip
                            label={`الدور: ${roleOptions.find(o => o.value === filters.role)?.label}`}
                            onDelete={() => onFilterChange('role', '')}
                            size="small"
                            sx={{
                                bgcolor: '#f3e8ff',
                                color: '#6b21a8',
                                fontWeight: 500,
                            }}
                        />
                    )}
                    {filters.department && (
                        <Chip
                            label={`القسم: ${departments.find(d => d.id === filters.department)?.name}`}
                            onDelete={() => onFilterChange('department', '')}
                            size="small"
                            sx={{
                                bgcolor: '#dcfce7',
                                color: '#166534',
                                fontWeight: 500,
                            }}
                        />
                    )}
                </Box>
            )}
        </GlassCard>
    );
};

export default SmartFilters;
