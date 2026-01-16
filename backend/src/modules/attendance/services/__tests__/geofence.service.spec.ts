import { Test, TestingModule } from '@nestjs/testing';
import { GeofenceService, GeofenceResult } from '../geofence.service';

/**
 * 🧪 Geofence Service Unit Tests
 * 
 * Tests for:
 * - Location validation within geofence
 * - Distance calculation
 * - Direction calculation
 * - Coordinate validation
 * - Nearest branch finding
 */

describe('GeofenceService', () => {
    let service: GeofenceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GeofenceService],
        }).compile();

        service = module.get<GeofenceService>(GeofenceService);
    });

    describe('isWithinGeofence', () => {
        // Riyadh coordinates for testing
        const branchLat = 24.7136;
        const branchLng = 46.6753;
        const radius = 100; // 100 meters

        it('should return true when user is at exact branch location', () => {
            const result = service.isWithinGeofence(branchLat, branchLng, branchLat, branchLng, radius);

            expect(result.isWithin).toBe(true);
            expect(result.distance).toBe(0);
            expect(result.allowedRadius).toBe(radius);
        });

        it('should return true when user is within radius', () => {
            // Move ~50 meters north (approximately 0.00045 degrees latitude)
            const userLat = branchLat + 0.00045;
            const result = service.isWithinGeofence(userLat, branchLng, branchLat, branchLng, radius);

            expect(result.isWithin).toBe(true);
            expect(result.distance).toBeLessThan(radius);
        });

        it('should return false when user is outside radius', () => {
            // Move ~500 meters north (approximately 0.0045 degrees latitude)
            const userLat = branchLat + 0.0045;
            const result = service.isWithinGeofence(userLat, branchLng, branchLat, branchLng, radius);

            expect(result.isWithin).toBe(false);
            expect(result.distance).toBeGreaterThan(radius);
        });

        it('should return correct distance at boundary', () => {
            // Test at approximately 100 meters
            const result = service.isWithinGeofence(24.7145, 46.6753, branchLat, branchLng, radius);

            expect(result.allowedRadius).toBe(radius);
            expect(typeof result.distance).toBe('number');
        });
    });

    describe('getDistance', () => {
        it('should return 0 for same coordinates', () => {
            const distance = service.getDistance(24.7136, 46.6753, 24.7136, 46.6753);
            expect(distance).toBe(0);
        });

        it('should calculate distance between two points', () => {
            // Approx 1km apart
            const distance = service.getDistance(24.7136, 46.6753, 24.7226, 46.6753);

            expect(distance).toBeGreaterThan(900);
            expect(distance).toBeLessThan(1100);
        });

        it('should return same distance regardless of direction', () => {
            const distance1 = service.getDistance(24.7136, 46.6753, 24.7236, 46.6753);
            const distance2 = service.getDistance(24.7236, 46.6753, 24.7136, 46.6753);

            expect(distance1).toBe(distance2);
        });
    });

    describe('getDirection', () => {
        const baseLat = 24.7136;
        const baseLng = 46.6753;

        it('should return شمال (North) for northward direction', () => {
            const direction = service.getDirection(baseLat, baseLng, baseLat + 0.01, baseLng);
            expect(direction).toBe('شمال');
        });

        it('should return جنوب (South) for southward direction', () => {
            const direction = service.getDirection(baseLat, baseLng, baseLat - 0.01, baseLng);
            expect(direction).toBe('جنوب');
        });

        it('should return شرق (East) for eastward direction', () => {
            const direction = service.getDirection(baseLat, baseLng, baseLat, baseLng + 0.01);
            expect(direction).toBe('شرق');
        });

        it('should return غرب (West) for westward direction', () => {
            const direction = service.getDirection(baseLat, baseLng, baseLat, baseLng - 0.01);
            expect(direction).toBe('غرب');
        });

        it('should return شمال شرق (Northeast) for northeast direction', () => {
            const direction = service.getDirection(baseLat, baseLng, baseLat + 0.01, baseLng + 0.01);
            expect(direction).toBe('شمال شرق');
        });
    });

    describe('isValidCoordinates', () => {
        it('should return true for valid Riyadh coordinates', () => {
            expect(service.isValidCoordinates(24.7136, 46.6753)).toBe(true);
        });

        it('should return true for valid edge coordinates', () => {
            expect(service.isValidCoordinates(90, 180)).toBe(true);
            expect(service.isValidCoordinates(-90, -180)).toBe(true);
            expect(service.isValidCoordinates(0, 0)).toBe(true);
        });

        it('should return false for invalid latitude', () => {
            expect(service.isValidCoordinates(91, 46.6753)).toBe(false);
            expect(service.isValidCoordinates(-91, 46.6753)).toBe(false);
        });

        it('should return false for invalid longitude', () => {
            expect(service.isValidCoordinates(24.7136, 181)).toBe(false);
            expect(service.isValidCoordinates(24.7136, -181)).toBe(false);
        });

        it('should return false for NaN values', () => {
            expect(service.isValidCoordinates(NaN, 46.6753)).toBe(false);
            expect(service.isValidCoordinates(24.7136, NaN)).toBe(false);
        });
    });

    describe('findNearestBranch', () => {
        const branches = [
            { id: 'branch-1', name: 'Main Branch', latitude: 24.7136, longitude: 46.6753 },
            { id: 'branch-2', name: 'North Branch', latitude: 24.8136, longitude: 46.6753 },
            { id: 'branch-3', name: 'South Branch', latitude: 24.6136, longitude: 46.6753 },
        ];

        it('should return nearest branch when user is at branch location', () => {
            const result = service.findNearestBranch(24.7136, 46.6753, branches);

            expect(result.branch).not.toBeNull();
            expect(result.branch?.id).toBe('branch-1');
            expect(result.distance).toBe(0);
        });

        it('should return nearest branch when user is between branches', () => {
            // User is between Main and North, closer to Main
            const result = service.findNearestBranch(24.7500, 46.6753, branches);

            expect(result.branch).not.toBeNull();
            expect(result.branch?.id).toBe('branch-1');
        });

        it('should return null for empty branches array', () => {
            const result = service.findNearestBranch(24.7136, 46.6753, []);

            expect(result.branch).toBeNull();
            expect(result.distance).toBe(Infinity);
        });

        it('should return single branch when only one exists', () => {
            const result = service.findNearestBranch(24.7136, 46.6753, [branches[0]]);

            expect(result.branch?.id).toBe('branch-1');
        });

        it('should select closest branch even if far away', () => {
            // User is far south, closest to South Branch
            const result = service.findNearestBranch(24.5000, 46.6753, branches);

            expect(result.branch?.id).toBe('branch-3');
        });
    });

    describe('bearingToDirection (private)', () => {
        // Test through getDirection which uses bearingToDirection internally
        it('should map 0 degrees to شمال', () => {
            const direction = service.getDirection(24.7136, 46.6753, 24.8136, 46.6753);
            expect(direction).toBe('شمال');
        });

        it('should map 180 degrees to جنوب', () => {
            const direction = service.getDirection(24.7136, 46.6753, 24.6136, 46.6753);
            expect(direction).toBe('جنوب');
        });
    });
});
