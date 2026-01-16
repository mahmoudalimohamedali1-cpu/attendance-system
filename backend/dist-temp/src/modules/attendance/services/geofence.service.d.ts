export interface GeofenceResult {
    isWithin: boolean;
    distance: number;
    allowedRadius: number;
}
export declare class GeofenceService {
    isWithinGeofence(userLat: number, userLng: number, centerLat: number, centerLng: number, radiusInMeters: number): GeofenceResult;
    getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
    getDirection(fromLat: number, fromLng: number, toLat: number, toLng: number): string;
    isValidCoordinates(latitude: number, longitude: number): boolean;
    findNearestBranch(userLat: number, userLng: number, branches: Array<{
        id: string;
        latitude: number;
        longitude: number;
        name: string;
    }>): {
        branch: (typeof branches)[0] | null;
        distance: number;
    };
    private bearingToDirection;
}
