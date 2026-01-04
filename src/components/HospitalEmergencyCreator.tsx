import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Hospital } from '@/hooks/useHospitals';
import { RouteData } from '@/hooks/useEmergencyTokens';
import { Search, MapPin, Ambulance, Building2, Navigation, User, Clock, Route } from 'lucide-react';

interface AmbulanceInfo {
  id: string;
  vehicle_number: string;
  current_lat: number | null;
  current_lng: number | null;
  emergency_status: 'inactive' | 'active' | 'responding';
  speed: number | null;
}

interface HospitalEmergencyCreatorProps {
  ambulances: AmbulanceInfo[];
  hospitals: Hospital[];
  onCreateEmergency: (
    ambulance: AmbulanceInfo,
    pickupLat: number,
    pickupLng: number,
    pickupAddress: string | undefined,
    hospital: Hospital,
    routeToPatient: RouteData,
    routeToHospital: RouteData
  ) => void;
  onCancel: () => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function HospitalEmergencyCreator({
  ambulances,
  hospitals,
  onCreateEmergency,
  onCancel
}: HospitalEmergencyCreatorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const patientMarkerRef = useRef<L.Marker | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [patientLocation, setPatientLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [selectedAmbulance, setSelectedAmbulance] = useState<AmbulanceInfo | null>(null);
  const [nearestHospital, setNearestHospital] = useState<Hospital | null>(null);
  const [routeToPatient, setRouteToPatient] = useState<RouteData | null>(null);
  const [routeToHospital, setRouteToHospital] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'location' | 'ambulance' | 'confirm'>('location');

  // Filter only free ambulances
  const freeAmbulances = ambulances.filter(a => 
    a.emergency_status === 'inactive' && a.current_lat && a.current_lng
  );

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Sort ambulances by distance from patient
  const sortedAmbulances = patientLocation
    ? [...freeAmbulances]
        .map(a => ({
          ...a,
          distance: calculateDistance(patientLocation.lat, patientLocation.lng, a.current_lat!, a.current_lng!)
        }))
        .sort((a, b) => a.distance - b.distance)
    : freeAmbulances.map(a => ({ ...a, distance: 0 }));

  // Find nearest hospital from patient location
  const findNearestHospital = useCallback((lat: number, lng: number) => {
    const sorted = [...hospitals]
      .map(h => ({
        ...h,
        distance: calculateDistance(lat, lng, h.location_lat, h.location_lng)
      }))
      .sort((a, b) => a.distance - b.distance);
    return sorted[0] || null;
  }, [hospitals]);

  // Fetch route between two points
  const fetchRoute = async (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<RouteData | null> => {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes?.length) return null;

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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapRef.current = L.map(mapContainer.current).setView([30.7333, 76.7794], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapRef.current);

    // Add click handler for patient location
    mapRef.current.on('click', async (e: L.LeafletMouseEvent) => {
      if (step !== 'location') return;
      
      const { lat, lng } = e.latlng;
      placePatientMarker(lat, lng);
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        const address = data.display_name || undefined;
        setPatientLocation({ lat, lng, address });
      } catch {
        setPatientLocation({ lat, lng });
      }
    });

    // Add ambulance markers
    freeAmbulances.forEach(amb => {
      if (!amb.current_lat || !amb.current_lng) return;
      
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
      L.marker([amb.current_lat, amb.current_lng], { icon: ambulanceIcon })
        .addTo(mapRef.current!)
        .bindPopup(`${amb.vehicle_number} (Free)`);
    });

    // Add hospital markers
    hospitals.forEach(hospital => {
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
  }, []);

  const placePatientMarker = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;

    if (patientMarkerRef.current) {
      patientMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const patientIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 32px;
          height: 32px;
          background: hsl(0, 84%, 60%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        "><div style="transform: rotate(45deg); font-size: 14px;">👤</div></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });
      patientMarkerRef.current = L.marker([lat, lng], { icon: patientIcon })
        .addTo(mapRef.current)
        .bindPopup('Patient Location');
    }

    mapRef.current.setView([lat, lng], 14);
  }, []);

  // Draw routes on map
  useEffect(() => {
    if (!mapRef.current) return;

    routeLayersRef.current.forEach(layer => layer.remove());
    routeLayersRef.current = [];

    if (routeToPatient) {
      const polyline = L.polyline(routeToPatient.coordinates, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.9
      }).addTo(mapRef.current);
      routeLayersRef.current.push(polyline);
    }

    if (routeToHospital) {
      const polyline = L.polyline(routeToHospital.coordinates, {
        color: '#22c55e',
        weight: 5,
        opacity: 0.9
      }).addTo(mapRef.current);
      routeLayersRef.current.push(polyline);
    }
  }, [routeToPatient, routeToHospital]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    placePatientMarker(lat, lng);
    setPatientLocation({ lat, lng, address: result.display_name });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSelectAmbulance = async (ambulance: AmbulanceInfo & { distance: number }) => {
    if (!patientLocation || !ambulance.current_lat || !ambulance.current_lng) return;
    
    setSelectedAmbulance(ambulance);
    setLoading(true);

    // Find nearest hospital
    const hospital = findNearestHospital(patientLocation.lat, patientLocation.lng);
    if (!hospital) {
      setLoading(false);
      return;
    }
    setNearestHospital(hospital);

    // Calculate routes
    const routePatient = await fetchRoute(
      ambulance.current_lat,
      ambulance.current_lng,
      patientLocation.lat,
      patientLocation.lng
    );

    const routeHospital = await fetchRoute(
      patientLocation.lat,
      patientLocation.lng,
      hospital.location_lat,
      hospital.location_lng
    );

    if (routePatient && routeHospital) {
      setRouteToPatient(routePatient);
      setRouteToHospital(routeHospital);
      setStep('confirm');
    }

    setLoading(false);
  };

  const handleConfirmEmergency = () => {
    if (!selectedAmbulance || !patientLocation || !nearestHospital || !routeToPatient || !routeToHospital) return;
    
    onCreateEmergency(
      selectedAmbulance,
      patientLocation.lat,
      patientLocation.lng,
      patientLocation.address,
      nearestHospital,
      routeToPatient,
      routeToHospital
    );
  };

  const formatDistance = (meters: number) => (meters / 1000).toFixed(1) + ' km';
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Create Emergency</h2>
          <p className="text-sm text-muted-foreground">
            {step === 'location' && 'Step 1: Mark patient location on map'}
            {step === 'ambulance' && 'Step 2: Select a free ambulance'}
            {step === 'confirm' && 'Step 3: Confirm and dispatch'}
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        <Badge variant={step === 'location' ? 'default' : 'secondary'}>1. Patient Location</Badge>
        <div className="w-4 h-0.5 bg-border" />
        <Badge variant={step === 'ambulance' ? 'default' : 'secondary'}>2. Select Ambulance</Badge>
        <div className="w-4 h-0.5 bg-border" />
        <Badge variant={step === 'confirm' ? 'default' : 'secondary'}>3. Confirm</Badge>
      </div>

      {/* Search bar */}
      {step === 'location' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Search patient location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="bg-card border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                  onClick={() => selectSearchResult(result)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-1 text-destructive flex-shrink-0" />
                    <span className="text-sm line-clamp-2">{result.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div ref={mapContainer} className="h-[350px] rounded-xl overflow-hidden border" />

      {/* Patient location info */}
      {patientLocation && step === 'location' && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">Patient Location Selected</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {patientLocation.address || `${patientLocation.lat.toFixed(4)}, ${patientLocation.lng.toFixed(4)}`}
                  </p>
                </div>
              </div>
              <Button onClick={() => setStep('ambulance')}>
                Next: Select Ambulance
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ambulance selection */}
      {step === 'ambulance' && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Available Ambulances ({freeAmbulances.length} free)</p>
          {sortedAmbulances.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No free ambulances available</p>
          ) : (
            <div className="grid gap-2 max-h-[200px] overflow-y-auto">
              {sortedAmbulances.map((amb, index) => (
                <button
                  key={amb.id}
                  onClick={() => handleSelectAmbulance(amb)}
                  disabled={loading}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${
                    selectedAmbulance?.id === amb.id
                      ? 'border-primary bg-primary/10 ring-2 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-green-500 text-white' : 'bg-muted'
                      }`}>
                        <Ambulance className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-medium">{amb.vehicle_number}</span>
                        {index === 0 && <Badge variant="secondary" className="ml-2 text-xs">Nearest</Badge>}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistance(amb.distance)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          <Button variant="outline" onClick={() => setStep('location')} className="w-full">
            Back to Location
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-4">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
          Calculating routes...
        </div>
      )}

      {/* Confirmation */}
      {step === 'confirm' && routeToPatient && routeToHospital && nearestHospital && (
        <div className="space-y-4">
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                {selectedAmbulance?.vehicle_number} → Patient
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
                Patient → {nearestHospital.organization_name}
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

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('ambulance')} className="flex-1">
              Back
            </Button>
            <Button onClick={handleConfirmEmergency} className="flex-1" size="lg">
              <Navigation className="w-5 h-5 mr-2" />
              Dispatch Ambulance
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Click on the map to mark patient location, then select the nearest available ambulance
      </p>
    </div>
  );
}
