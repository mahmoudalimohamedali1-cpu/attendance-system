"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeofenceService = void 0;
const common_1 = require("@nestjs/common");
const geolib = require("geolib");
let GeofenceService = class GeofenceService {
    isWithinGeofence(userLat, userLng, centerLat, centerLng, radiusInMeters) {
        const distance = geolib.getDistance({ latitude: userLat, longitude: userLng }, { latitude: centerLat, longitude: centerLng });
        return {
            isWithin: distance <= radiusInMeters,
            distance,
            allowedRadius: radiusInMeters,
        };
    }
    getDistance(lat1, lng1, lat2, lng2) {
        return geolib.getDistance({ latitude: lat1, longitude: lng1 }, { latitude: lat2, longitude: lng2 });
    }
    getDirection(fromLat, fromLng, toLat, toLng) {
        const bearing = geolib.getGreatCircleBearing({ latitude: fromLat, longitude: fromLng }, { latitude: toLat, longitude: toLng });
        return this.bearingToDirection(bearing);
    }
    isValidCoordinates(latitude, longitude) {
        return geolib.isValidCoordinate({ latitude, longitude });
    }
    findNearestBranch(userLat, userLng, branches) {
        if (!branches.length) {
            return { branch: null, distance: Infinity };
        }
        let nearestBranch = branches[0];
        let minDistance = this.getDistance(userLat, userLng, branches[0].latitude, branches[0].longitude);
        for (const branch of branches.slice(1)) {
            const distance = this.getDistance(userLat, userLng, branch.latitude, branch.longitude);
            if (distance < minDistance) {
                minDistance = distance;
                nearestBranch = branch;
            }
        }
        return { branch: nearestBranch, distance: minDistance };
    }
    bearingToDirection(bearing) {
        const directions = [
            'شمال',
            'شمال شرق',
            'شرق',
            'جنوب شرق',
            'جنوب',
            'جنوب غرب',
            'غرب',
            'شمال غرب',
        ];
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    }
};
exports.GeofenceService = GeofenceService;
exports.GeofenceService = GeofenceService = __decorate([
    (0, common_1.Injectable)()
], GeofenceService);
//# sourceMappingURL=geofence.service.js.map