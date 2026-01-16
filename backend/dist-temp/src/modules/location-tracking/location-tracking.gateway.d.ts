import { LiveLocationDto } from './dto/location-tracking.dto';
export declare class LocationTrackingGateway {
    private readonly logger;
    broadcastLocationUpdate(userId: string, location: LiveLocationDto): void;
    broadcastGeofenceExit(userId: string, exitEvent: any): void;
    broadcastGeofenceReturn(userId: string, returnEvent: any): void;
    hasWatchers(userId: string): boolean;
}
