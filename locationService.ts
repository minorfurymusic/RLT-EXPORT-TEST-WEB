
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
}

class LocationService {
  private watchId: number | null = null;
  private lastLocation: LocationData | null = null;
  private totalDistance: number = 0; // in km
  private onLocationCallback: ((data: LocationData, distance: number) => void) | null = null;

  public async requestPermission(): Promise<boolean> {
    if (!navigator.geolocation) return false;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 2000);
      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(timeout);
          resolve(true);
        },
        () => {
          clearTimeout(timeout);
          resolve(false);
        },
        { timeout: 2000 }
      );
    });
  }

  public startTracking(onLocation: (data: LocationData, distance: number) => void) {
    if (this.watchId !== null) return;
    this.onLocationCallback = onLocation;
    this.totalDistance = 0;
    this.lastLocation = null;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const data: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          speed: position.coords.speed,
        };

        if (this.lastLocation) {
          const dist = this.calculateDistance(
            this.lastLocation.latitude,
            this.lastLocation.longitude,
            data.latitude,
            data.longitude
          );
          // Only add distance if accuracy is reasonable (e.g., < 30m)
          if (data.accuracy < 30) {
            this.totalDistance += dist;
          }
        }

        this.lastLocation = data;
        if (this.onLocationCallback) {
          this.onLocationCallback(data, this.totalDistance);
        }
      },
      (error) => {
        console.error('Error watching position:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }

  public stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  public getDistance(): number {
    return this.totalDistance;
  }
}

export const locationService = new LocationService();
