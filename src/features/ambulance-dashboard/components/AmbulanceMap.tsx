import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from 'lucide-react';
import Map from '@/components/Map';
import { Ambulance, PickupLocation } from '../types';

interface AmbulanceMapProps {
  ambulance: Ambulance | null;
  showLocationPicker: boolean;
  pickupLocation: PickupLocation | null;
  mapMarkers: Array<{
    position: [number, number];
    popup: string;
    icon: 'ambulance' | 'signal' | 'hospital';
    highlighted?: boolean;
  }>;
  currentRoute?: { coordinates: [number, number][] } | null;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  onLocationUpdate: (lat: number, lng: number) => void;
}

export const AmbulanceMap: React.FC<AmbulanceMapProps> = ({
  ambulance,
  showLocationPicker,
  pickupLocation,
  mapMarkers,
  currentRoute,
  onLocationSelect,
  onLocationUpdate
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Navigation className="w-5 h-5" />
          {showLocationPicker ? 'Select Patient Location' : 'Live Map'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-square w-full rounded-lg overflow-hidden border">
          <Map
            center={ambulance ? [ambulance.current_lat, ambulance.current_lng] : [30.7333, 76.7794]}
            zoom={showLocationPicker ? 13 : 14}
            onMapClick={showLocationPicker ? onLocationSelect : undefined}
            onLocationUpdate={(lat, lng) => onLocationUpdate(lat, lng)}
            markers={mapMarkers}
            route={showLocationPicker ? undefined : currentRoute?.coordinates}
            className={showLocationPicker ? 'cursor-crosshair' : ''}
          />
        </div>
        {showLocationPicker && (
          <div className="mt-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                📍 Map Selection Mode Active
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Click anywhere on the map to select patient pickup location
              </p>
            </div>
            {pickupLocation && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg mt-2">
                <p className="text-sm font-medium text-green-800">✅ Location Selected</p>
                <p className="text-xs font-mono text-green-600">
                  {pickupLocation.lat.toFixed(6)}, {pickupLocation.lng.toFixed(6)}
                </p>
                {pickupLocation.address && (
                  <p className="text-xs text-green-600 mt-1">{pickupLocation.address}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};