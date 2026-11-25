import { Geolocation } from '@capacitor/geolocation';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { LocationCoordinates } from '../types/item.types';

const DEFAULT_CENTER: LocationCoordinates = {
  lat: 44.4323,
  lng: 26.1063
};

class LocationService {
  /**
   * Queries GPS location with permissions check and graceful fallback
   */
  async getCurrentPosition(): Promise<LocationCoordinates> {
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          return DEFAULT_CENTER;
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
    } catch (err) {
      console.warn('[LocationService] Geolocation unavailable, returning default coords:', err);
      return DEFAULT_CENTER;
    }
  }

  /**
   * Launches native directions app according to OS
   */
  async openDirections(loc: LocationCoordinates, label: string = 'Service Shop'): Promise<void> {
    const { lat, lng } = loc;
    const encodedLabel = encodeURIComponent(label);

    if (Capacitor.getPlatform() === 'android') {
      const geoUri = `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`;
      const canOpen = await AppLauncher.canOpenUrl({ url: geoUri });
      if (canOpen.value) {
        await AppLauncher.openUrl({ url: geoUri });
        return;
      }
    }

    // Web fallback or general browser redirection:
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  }
}

export const locationService = new LocationService();