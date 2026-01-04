import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Clock, Route } from 'lucide-react';

interface RouteOption {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  type: 'shortest' | 'fastest';
}

interface RouteMapProps {
  pickupLat: number;
  pickupLng: number;
  hospitalLat: number;
  hospitalLng: number;
  hospitalName: string;
  onRouteSelect: (route: RouteOption) => void;
  className?: string;
}

export default function RouteMap({
  pickupLat,
  pickupLng,
  hospitalLat,
  hospitalLng,
  hospitalName,
  onRouteSelect,
  className = ''
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch routes from OSRM
  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      setError(null);

      try {
        // OSRM public demo server - for production use your own instance
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${hospitalLng},${hospitalLat}?overview=full&geometries=geojson&alternatives=true`;
        
        const response = await fetch(osrmUrl);
        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes?.length) {
          throw new Error('No routes found');
        }

        const routeOptions: RouteOption[] = data.routes.map((route: {
          geometry: { coordinates: [number, number][] };
          distance: number;
          duration: number;
        }, index: number) => ({
          coordinates: route.geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] as [number, number] // OSRM returns [lng, lat]
          ),
          distance: route.distance,
          duration: route.duration,
          type: index === 0 ? 'fastest' : 'shortest' as const
        }));

        // Sort: first by duration (fastest), add a "shortest" label to the shortest by distance
        routeOptions.sort((a, b) => a.duration - b.duration);
        if (routeOptions.length > 0) routeOptions[0].type = 'fastest';
        
        const shortestByDistance = routeOptions.reduce(
          (min, r) => r.distance < min.distance ? r : min,
          routeOptions[0]
        );
        if (shortestByDistance !== routeOptions[0]) {
          shortestByDistance.type = 'shortest';
        }

        setRoutes(routeOptions);
      } catch (err) {
        console.error('Route fetch error:', err);
        setError('Failed to calculate routes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [pickupLat, pickupLng, hospitalLat, hospitalLng]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const centerLat = (pickupLat + hospitalLat) / 2;
    const centerLng = (pickupLng + hospitalLng) / 2;

    mapRef.current = L.map(mapContainer.current).setView([centerLat, centerLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapRef.current);

    // Add pickup marker
    const pickupIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 28px;
        height: 28px;
        background: hsl(0, 84%, 60%);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      ">🚑</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    L.marker([pickupLat, pickupLng], { icon: pickupIcon })
      .addTo(mapRef.current)
      .bindPopup('Patient Pickup Location');

    // Add hospital marker
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
    L.marker([hospitalLat, hospitalLng], { icon: hospitalIcon })
      .addTo(mapRef.current)
      .bindPopup(hospitalName);

    // Fit bounds
    const bounds = L.latLngBounds([
      [pickupLat, pickupLng],
      [hospitalLat, hospitalLng]
    ]);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pickupLat, pickupLng, hospitalLat, hospitalLng, hospitalName]);

  // Draw routes on map
  useEffect(() => {
    if (!mapRef.current || routes.length === 0) return;

    // Clear existing routes
    routeLayersRef.current.forEach(layer => layer.remove());
    routeLayersRef.current = [];

    // Draw routes
    routes.forEach((route, index) => {
      const isSelected = selectedRoute?.type === route.type;
      const color = route.type === 'fastest' ? '#3b82f6' : '#22c55e';
      const weight = isSelected ? 6 : 4;
      const opacity = isSelected ? 1 : 0.6;

      const polyline = L.polyline(route.coordinates, {
        color,
        weight,
        opacity,
        dashArray: isSelected ? undefined : '10, 10'
      }).addTo(mapRef.current!);

      polyline.on('click', () => {
        setSelectedRoute(route);
      });

      routeLayersRef.current.push(polyline);
    });

    // Fit to selected route or all routes
    if (selectedRoute) {
      const bounds = L.latLngBounds(selectedRoute.coordinates);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, selectedRoute]);

  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(2) + ' km';
  };

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
        className="h-[350px] rounded-xl overflow-hidden border border-border"
      />

      {/* Route Options */}
      {loading && (
        <div className="text-center py-4 text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
          Calculating routes...
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {!loading && routes.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Select Route:</p>
          {routes.map((route) => (
            <button
              key={route.type}
              onClick={() => setSelectedRoute(route)}
              className={`w-full p-4 rounded-lg border transition-all text-left ${
                selectedRoute?.type === route.type
                  ? 'border-primary bg-primary/10 ring-2 ring-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    route.type === 'fastest' ? 'bg-blue-500/20' : 'bg-green-500/20'
                  }`}>
                    {route.type === 'fastest' ? (
                      <Clock className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Route className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{route.type} Route</span>
                      <Badge variant={route.type === 'fastest' ? 'default' : 'secondary'}>
                        {route.type === 'fastest' ? 'Recommended' : 'Alternative'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{formatDistance(route.distance)}</span>
                      <span>•</span>
                      <span>{formatDuration(route.duration)}</span>
                    </div>
                  </div>
                </div>
                {selectedRoute?.type === route.type && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          ))}

          {selectedRoute && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => onRouteSelect(selectedRoute)}
            >
              <Navigation className="w-5 h-5 mr-2" />
              Share Route with Ambulance
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
