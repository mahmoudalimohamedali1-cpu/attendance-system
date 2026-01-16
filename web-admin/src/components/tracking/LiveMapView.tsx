/**
 * LiveMapView - خريطة تفاعلية حية للموظفين
 * Feature #1: عرض جميع الموظفين على خريطة Leaflet مع geofences
 */

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Box, Typography, Chip, Avatar, Paper } from '@mui/material';
import { CheckCircle, Warning, Battery0Bar, Battery4Bar, BatteryFull } from '@mui/icons-material';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Interface for employee data
export interface MapEmployee {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    branchName: string;
    departmentName?: string;
    checkInTime: Date;
    lastLocation?: {
        latitude: number;
        longitude: number;
        isInsideGeofence: boolean;
        distanceFromBranch: number;
        updatedAt: Date;
        batteryLevel?: number;
    };
    exitEvents: number;
}

export interface Branch {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    geofenceRadius: number;
}

interface LiveMapViewProps {
    employees: MapEmployee[];
    branches?: Branch[];
    selectedEmployeeId?: string | null;
    onEmployeeClick?: (employeeId: string) => void;
    height?: string | number;
}

// Custom marker icons
const createEmployeeIcon = (isInside: boolean, initial: string) => {
    const color = isInside ? '#4caf50' : '#f44336';
    return L.divIcon({
        className: 'custom-employee-marker',
        html: `
            <div style="
                background: ${color};
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 16px;
                border: 3px solid white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            ">${initial}</div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });
};

const branchIcon = L.divIcon({
    className: 'branch-marker',
    html: `
        <div style="
            background: #2196f3;
            width: 30px;
            height: 30px;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
            border: 2px solid white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        ">🏢</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

// Component to handle map center updates
const MapCenterUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

// Battery indicator component
const BatteryIndicator = ({ level }: { level?: number }) => {
    if (!level && level !== 0) return null;

    const Icon = level > 60 ? BatteryFull : level > 20 ? Battery4Bar : Battery0Bar;
    const color = level > 60 ? '#4caf50' : level > 20 ? '#ff9800' : '#f44336';

    return (
        <Box display="flex" alignItems="center" gap={0.5}>
            <Icon sx={{ fontSize: 16, color }} />
            <Typography variant="caption" sx={{ color }}>{level}%</Typography>
        </Box>
    );
};

export const LiveMapView = ({
    employees,
    branches = [],
    selectedEmployeeId,
    onEmployeeClick,
    height = 500,
}: LiveMapViewProps) => {
    const mapRef = useRef<L.Map>(null);

    // Calculate map center from employees or default to Riyadh
    const mapCenter = useMemo<[number, number]>(() => {
        const employeesWithLocation = employees.filter(e => e.lastLocation);
        if (employeesWithLocation.length > 0) {
            const lat = employeesWithLocation.reduce((sum, e) => sum + e.lastLocation!.latitude, 0) / employeesWithLocation.length;
            const lng = employeesWithLocation.reduce((sum, e) => sum + e.lastLocation!.longitude, 0) / employeesWithLocation.length;
            return [lat, lng];
        }
        if (branches.length > 0) {
            return [branches[0].latitude, branches[0].longitude];
        }
        // Default: Riyadh
        return [24.7136, 46.6753];
    }, [employees, branches]);

    // Focus on selected employee
    useEffect(() => {
        if (selectedEmployeeId && mapRef.current) {
            const emp = employees.find(e => e.id === selectedEmployeeId);
            if (emp?.lastLocation) {
                mapRef.current.setView(
                    [emp.lastLocation.latitude, emp.lastLocation.longitude],
                    16
                );
            }
        }
    }, [selectedEmployeeId, employees]);

    return (
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ height, width: '100%' }}
                ref={mapRef}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapCenterUpdater center={mapCenter} />

                {/* Branch markers and geofence circles */}
                {branches.map((branch) => (
                    <div key={branch.id}>
                        <Marker
                            position={[branch.latitude, branch.longitude]}
                            icon={branchIcon}
                        >
                            <Popup>
                                <Box sx={{ minWidth: 150 }}>
                                    <Typography fontWeight="bold">🏢 {branch.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        نطاق الجيوفنس: {branch.geofenceRadius} متر
                                    </Typography>
                                </Box>
                            </Popup>
                        </Marker>
                        <Circle
                            center={[branch.latitude, branch.longitude]}
                            radius={branch.geofenceRadius}
                            pathOptions={{
                                color: '#2196f3',
                                fillColor: '#2196f3',
                                fillOpacity: 0.1,
                                weight: 2,
                            }}
                        />
                    </div>
                ))}

                {/* Employee markers */}
                {employees.map((employee) => {
                    if (!employee.lastLocation) return null;

                    const isInside = employee.lastLocation.isInsideGeofence;
                    const initial = employee.firstName.charAt(0);

                    return (
                        <Marker
                            key={employee.id}
                            position={[employee.lastLocation.latitude, employee.lastLocation.longitude]}
                            icon={createEmployeeIcon(isInside, initial)}
                            eventHandlers={{
                                click: () => onEmployeeClick?.(employee.id),
                            }}
                        >
                            <Popup>
                                <Box sx={{ minWidth: 200, p: 1 }}>
                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                        <Avatar sx={{
                                            bgcolor: isInside ? '#4caf50' : '#f44336',
                                            width: 36,
                                            height: 36
                                        }}>
                                            {initial}
                                        </Avatar>
                                        <Box>
                                            <Typography fontWeight="bold">
                                                {employee.firstName} {employee.lastName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {employee.employeeCode}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box display="flex" gap={0.5} flexWrap="wrap" mb={1}>
                                        <Chip
                                            size="small"
                                            icon={isInside ? <CheckCircle /> : <Warning />}
                                            label={isInside ? 'داخل النطاق' : 'خارج النطاق'}
                                            color={isInside ? 'success' : 'error'}
                                        />
                                        <Chip
                                            size="small"
                                            label={`${employee.lastLocation.distanceFromBranch} م`}
                                            variant="outlined"
                                        />
                                    </Box>

                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">
                                            آخر تحديث: {new Date(employee.lastLocation.updatedAt).toLocaleTimeString('ar-EG')}
                                        </Typography>
                                        <BatteryIndicator level={employee.lastLocation.batteryLevel} />
                                    </Box>

                                    {employee.exitEvents > 0 && (
                                        <Chip
                                            size="small"
                                            label={`${employee.exitEvents} مرات خروج`}
                                            color="warning"
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                </Box>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Legend */}
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
                <Box display="flex" gap={3} justifyContent="center" flexWrap="wrap">
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#4caf50' }} />
                        <Typography variant="body2">داخل النطاق</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#f44336' }} />
                        <Typography variant="body2">خارج النطاق</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: '#2196f3' }} />
                        <Typography variant="body2">فرع/مقر</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{
                            width: 24,
                            height: 16,
                            border: '2px dashed #2196f3',
                            borderRadius: '50%',
                            bgcolor: 'rgba(33, 150, 243, 0.1)'
                        }} />
                        <Typography variant="body2">نطاق الجيوفنس</Typography>
                    </Box>
                </Box>
            </Box>

            {/* Custom CSS for markers */}
            <style>{`
                .custom-employee-marker, .branch-marker {
                    background: transparent !important;
                    border: none !important;
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                }
                .leaflet-popup-content {
                    margin: 8px;
                }
            `}</style>
        </Paper>
    );
};

export default LiveMapView;
