import { useEffect, useState, useRef } from 'react';
import { Ambulance } from '../types';

export const useGeolocation = (
  ambulance: Ambulance | null,
  activeTokenStatus: string | undefined,
  updateLocation: (lat: number, lng: number, heading: number, speed: number) => void
) => {
  const [watchId, setWatchId] = useState<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  useEffect(() => {
    if (!ambulance || !('geolocation' in navigator)) return;

    const isJourneyActive = activeTokenStatus === 'in_progress' || activeTokenStatus === 'to_hospital';

    if (isJourneyActive && !watchId) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          let speed = (position.coords.speed ?? 0) * 3.6;

          if (speed === 0 && lastPositionRef.current) {
            const dt = (now - lastPositionRef.current.time) / 1000;
            if (dt > 0) {
              const R = 6371000;
              const dLat = (position.coords.latitude - lastPositionRef.current.lat) * (Math.PI / 180);
              const dLng = (position.coords.longitude - lastPositionRef.current.lng) * (Math.PI / 180);
              const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(lastPositionRef.current.lat * (Math.PI / 180)) *
                  Math.cos(position.coords.latitude * (Math.PI / 180)) *
                  Math.sin(dLng / 2) ** 2;
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distanceM = R * c;

              if (distanceM > 5) {
                speed = (distanceM / dt) * 3.6;
              } else {
                speed = 0;
              }
            }
          }

          const shouldUpdateLastPos =
            !lastPositionRef.current ||
            Math.abs(position.coords.latitude - lastPositionRef.current.lat) > 0.00005 ||
            Math.abs(position.coords.longitude - lastPositionRef.current.lng) > 0.00005;

          if (shouldUpdateLastPos) {
            lastPositionRef.current = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              time: now,
            };
          }

          updateLocation(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.heading || 0,
            speed
          );
        },
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      setWatchId(id);
    } else if (!isJourneyActive && watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [activeTokenStatus, ambulance, updateLocation, watchId]);

  return { watchId };
};