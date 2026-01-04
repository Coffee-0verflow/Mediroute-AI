import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation, Clock, Route, MapPin, Building2, User } from 'lucide-react';
import { Hospital } from '@/hooks/useHospitals';

interface RouteOption {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  type: 'shortest' | 'fastest';
}

interface TwoLegRoute {
  toPatient: RouteOption;
  toHospital: RouteOption;
  totalDistance: number;
  totalDuration: number;
}

interface TwoLegRouteMapProps {
  ambulanceLat: number;
  ambulanceLng: number;
  pickupLat: number;
  pickupLng: number;
  hospitals: Hospital[];
  onRouteSelect: (
    selectedHospital: Hospital,
    routeToPatient: RouteOption,
    routeToHospital: RouteOption
  ) => void;
  className?: string;
}

export default function TwoLegRouteMap({
  ambulanceLat,
  ambulanceLng,
  pickupLat,
  pickupLng,
  hospitals,
  onRouteSelect,
  className = ''
}: TwoLegRouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [routeToPatient, setRouteToPatient] = useState<RouteOption | null>(null);
  const [routeToHospital, setRouteToHospital] = useState<RouteOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate distance to hospital from patient pickup
  const calculateDistance = (hospitalLat: number, hospitalLng: number) => {
    const R = 6371000;
    const dLat = (hospitalLat - pickupLat) * (Math.PI / 180);
    const dLng = (hospitalLng - pickupLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(pickupLat * (Math.PI / 180)) *
        Math.cos(hospitalLat * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Sort hospitals by distance from patient pickup
  const sortedHospitals = [...hospitals]
    .map(h => ({ ...h, distance: calculateDistance(h.location_lat, h.location_lng) }))
    .sort((a, b) => a.distance - b.distance);

  // Fetch route between two points
  const fetchRoute = async (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<RouteOption | null> => {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes?.length) {
        return null;
      }

      const route = data.routes[0];
      return {
        coordinates: route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        ),
        distance: route.distance,
        duration: route.duration,
        type: 'fastest'
      };
    } catch (err) {
      console.error('Route fetch error:', err);
      return null;
    }
  };

  // Handle hospital selection - calculate both routes
  const handleHospitalSelect = async (hospital: Hospital) => {
    if (!hospital.location_lat || !hospital.location_lng) return;
    
    setSelectedHospital(hospital);
    setLoading(true);
    setError(null);
    setRouteToPatient(null);
    setRouteToHospital(null);

    try {
      // Fetch route from ambulance to patient
      const patientRoute = await fetchRoute(
        ambulanceLat,
        ambulanceLng,
        pickupLat,
        pickupLng
      );

      // Fetch route from patient to hospital
      const hospitalRoute = await fetchRoute(
        pickupLat,
        pickupLng,
        hospital.location_lat,
        hospital.location_lng
      );

      if (!patientRoute || !hospitalRoute) {
        throw new Error('Could not calculate routes');
      }

      setRouteToPatient(patientRoute);
      setRouteToHospital(hospitalRoute);
    } catch (err) {
      setError('Failed to calculate routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const centerLat = (ambulanceLat + pickupLat) / 2;
    const centerLng = (ambulanceLng + pickupLng) / 2;

    mapRef.current = L.map(mapContainer.current).setView([centerLat, centerLng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapRef.current);

    // Add ambulance marker
    const ambulanceIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 32px;
        height: 32px;
        background: hsl(220, 90%, 56%);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      ">🚑</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    L.marker([ambulanceLat, ambulanceLng], { icon: ambulanceIcon })
      .addTo(mapRef.current)
      .bindPopup('Ambulance Location');

    // Add patient marker
    const patientIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 32px;
        height: 32px;
        background: hsl(0, 84%, 60%);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      ">👤</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    L.marker([pickupLat, pickupLng], { icon: patientIcon })
      .addTo(mapRef.current)
      .bindPopup('Patient Pickup Location');

    // Add hospital markers
    hospitals.forEach(hospital => {
      if (!hospital.location_lat || !hospital.location_lng) return;
      
      const hospitalIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 28px;
          height: 28px;
          background: hsl(142, 71%, 45%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        ">🏥</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      L.marker([hospital.location_lat, hospital.location_lng], { icon: hospitalIcon })
        .addTo(mapRef.current!)
        .bindPopup(hospital.organization_name);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [ambulanceLat, ambulanceLng, pickupLat, pickupLng, hospitals]);

  // Draw routes on map
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing routes
    routeLayersRef.current.forEach(layer => layer.remove());
    routeLayersRef.current = [];

    // Draw route to patient (blue)
    if (routeToPatient) {
      const polyline = L.polyline(routeToPatient.coordinates, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.9
      }).addTo(mapRef.current);
      routeLayersRef.current.push(polyline);
    }

    // Draw route to hospital (green)
    if (routeToHospital) {
      const polyline = L.polyline(routeToHospital.coordinates, {
        color: '#22c55e',
        weight: 5,
        opacity: 0.9
      }).addTo(mapRef.current);
      routeLayersRef.current.push(polyline);
    }

    // Fit bounds to show all routes
    if (routeToPatient && routeToHospital && selectedHospital) {
      const allCoords = [
        ...routeToPatient.coordinates,
        ...routeToHospital.coordinates
      ];
      const bounds = L.latLngBounds(allCoords);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeToPatient, routeToHospital, selectedHospital]);

  const formatDistance = (meters: number) => (meters / 1000).toFixed(2) + ' km';
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map */}
      <div 
        ref={mapContainer} 
        className="h-[400px] rounded-xl overflow-hidden border border-border"
      />

      {/* Hospital Selection */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Select Hospital (sorted by distance from patient):</p>
        <div className="grid gap-2 max-h-[250px] overflow-y-auto">
          {sortedHospitals.map((hospital, index) => (
            <button
              key={hospital.id}
              onClick={() => handleHospitalSelect(hospital)}
              className={`w-full p-3 rounded-lg border transition-all text-left ${
                selectedHospital?.id === hospital.id
                  ? 'border-primary bg-primary/10 ring-2 ring-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${index === 0 ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium">{hospital.organization_name}</span>
                    {index === 0 && <Badge variant="secondary" className="ml-2 text-xs">Nearest</Badge>}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {(hospital.distance / 1000).toFixed(1)} km
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-4 text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
          Calculating routes...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Route Summary */}
      {routeToPatient && routeToHospital && selectedHospital && (
        <div className="space-y-4">
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                Ambulance → Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-4 text-sm">
                <span>{formatDistance(routeToPatient.distance)}</span>
                <span>•</span>
                <span>{formatDuration(routeToPatient.duration)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                Patient → {selectedHospital.organization_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-4 text-sm">
                <span>{formatDistance(routeToHospital.distance)}</span>
                <span>•</span>
                <span>{formatDuration(routeToHospital.duration)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Journey</span>
                <div className="flex gap-4 text-sm">
                  <span>{formatDistance(routeToPatient.distance + routeToHospital.distance)}</span>
                  <span>•</span>
                  <span>{formatDuration(routeToPatient.duration + routeToHospital.duration)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full" 
            size="lg"
            onClick={() => onRouteSelect(selectedHospital, routeToPatient, routeToHospital)}
          >
            <Navigation className="w-5 h-5 mr-2" />
            Confirm & Share Routes with Ambulance
          </Button>
        </div>
      )}
    </div>
  );
}
