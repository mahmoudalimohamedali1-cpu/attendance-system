export interface Room {
    id: string;
    name: string;
    nameAr: string;
    floor: number;
    capacity: number;
    amenities: string[];
    available: boolean;
}
export interface RoomBooking {
    id: string;
    roomId: string;
    roomName: string;
    userId: string;
    userName: string;
    title: string;
    start: Date;
    end: Date;
    attendees: number;
    status: 'pending' | 'confirmed' | 'cancelled';
}
export interface ParkingSpot {
    id: string;
    zone: string;
    number: string;
    type: 'regular' | 'vip' | 'accessible' | 'ev';
    typeAr: string;
    assigned: boolean;
    assignedTo?: string;
}
export interface DeskReservation {
    id: string;
    deskNumber: string;
    floor: number;
    userId: string;
    date: Date;
    status: 'reserved' | 'checked_in' | 'cancelled';
}
export interface FacilityRequest {
    id: string;
    userId: string;
    type: 'maintenance' | 'cleaning' | 'supplies' | 'it' | 'security';
    typeAr: string;
    description: string;
    location: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'completed';
    createdAt: Date;
}
export declare class FacilitiesService {
    private readonly logger;
    private readonly rooms;
    private bookings;
    private deskReservations;
    private facilityRequests;
    getAvailableRooms(capacity?: number, floor?: number): Room[];
    bookRoom(roomId: string, userId: string, userName: string, title: string, start: Date, end: Date, attendees: number): {
        success: boolean;
        booking?: RoomBooking;
        message: string;
    };
    getParkingStatus(): {
        available: number;
        total: number;
        zones: {
            zone: string;
            available: number;
        }[];
    };
    reserveDesk(userId: string, deskNumber: string, floor: number, date: Date): {
        success: boolean;
        reservation?: DeskReservation;
        message: string;
    };
    submitRequest(userId: string, type: FacilityRequest['type'], description: string, location: string, priority: FacilityRequest['priority']): FacilityRequest;
    formatAvailableRooms(capacity?: number): string;
    formatBooking(booking: RoomBooking): string;
    formatParkingStatus(): string;
}
