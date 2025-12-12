import { Injectable } from '@nestjs/common';
import * as geolib from 'geolib';

export interface GeofenceResult {
  isWithin: boolean;
  distance: number;
  allowedRadius: number;
}

@Injectable()
export class GeofenceService {
  /**
   * Check if a point is within a geofence
   */
  isWithinGeofence(
    userLat: number,
    userLng: number,
    centerLat: number,
    centerLng: number,
    radiusInMeters: number,
  ): GeofenceResult {
    const distance = geolib.getDistance(
      { latitude: userLat, longitude: userLng },
      { latitude: centerLat, longitude: centerLng },
    );

    return {
      isWithin: distance <= radiusInMeters,
      distance,
      allowedRadius: radiusInMeters,
    };
  }

  /**
   * Calculate distance between two points
   */
  getDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    return geolib.getDistance(
      { latitude: lat1, longitude: lng1 },
      { latitude: lat2, longitude: lng2 },
    );
  }

  /**
   * Get compass direction from one point to another
   */
  getDirection(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): string {
    const bearing = geolib.getGreatCircleBearing(
      { latitude: fromLat, longitude: fromLng },
      { latitude: toLat, longitude: toLng },
    );

    return this.bearingToDirection(bearing);
  }

  /**
   * Check if coordinates are valid
   */
  isValidCoordinates(latitude: number, longitude: number): boolean {
    return geolib.isValidCoordinate({ latitude, longitude });
  }

  /**
   * Find the nearest branch for a user
   */
  findNearestBranch(
    userLat: number,
    userLng: number,
    branches: Array<{ id: string; latitude: number; longitude: number; name: string }>,
  ): { branch: (typeof branches)[0] | null; distance: number } {
    if (!branches.length) {
      return { branch: null, distance: Infinity };
    }

    let nearestBranch = branches[0];
    let minDistance = this.getDistance(
      userLat,
      userLng,
      branches[0].latitude,
      branches[0].longitude,
    );

    for (const branch of branches.slice(1)) {
      const distance = this.getDistance(
        userLat,
        userLng,
        branch.latitude,
        branch.longitude,
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestBranch = branch;
      }
    }

    return { branch: nearestBranch, distance: minDistance };
  }

  private bearingToDirection(bearing: number): string {
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
}

