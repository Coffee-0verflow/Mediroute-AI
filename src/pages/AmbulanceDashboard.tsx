import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAmbulance } from '@/hooks/useAmbulance';
import { useTrafficSignals } from '@/hooks/useTrafficSignals';
import { useEmergencyTokens } from '@/hooks/useEmergencyTokens';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, Navigation, LogOut, Power, Radio, Ticket, Play, CheckCircle, X, Route, ExternalLink, User, Building2 } from 'lucide-react';
import Map from '@/components/Map';
import LocationPicker from '@/components/LocationPicker';
import TrafficSignalStatusPanel from '@/components/TrafficSignalStatusPanel';
import { toast } from 'sonner';
import MediBot from "@/components/medibot";


export interface VehicleHealth {
  fuel_percent: number;
  battery_percent: number;
  oxygen_percent: number;
  tyres: {
    front_left: number;
    front_right: number;
    rear_left: number;
    rear_right: number;
  };
}

export interface Ambulance {
  id: string;
  vehicle_number: string;
  current_lat: number;
  current_lng: number;
  speed: number;
  heading: number;
  vehicle_health: VehicleHealth;
}

export default function AmbulanceDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { ambulance, loading: ambLoading, updateLocation, isSimulating, startSimulation, stopSimulation } = useAmbulance();
  const { signals, checkSignalsForAmbulance } = useTrafficSignals();
  
  const { 
    activeToken, 
    createToken,
    startJourney, 
    arrivedAtPatient, 
    startToHospital, 
    completeEmergency, 
    cancelEmergency
  } = useEmergencyTokens();
  
  const [watchId, setWatchId] = useState<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  
  // Emergency creation state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Geolocation tracking when journey is in progress
  useEffect(() => {
    if (!ambulance || !('geolocation' in navigator)) return;

    const isJourneyActive = activeToken?.status === 'in_progress' || activeToken?.status === 'to_hospital';

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
  }, [activeToken?.status]);

  // Check signals when ambulance moves during active journey
  useEffect(() => {
    if (ambulance && (activeToken?.status === 'in_progress' || activeToken?.status === 'to_hospital')) {
      checkSignalsForAmbulance(ambulance);
    }
  }, [ambulance?.current_lat, ambulance?.current_lng, activeToken?.status]);

  // Simulated movement
  useEffect(() => {
    if (!isSimulating || !ambulance) return;

    const interval = setInterval(() => {
      const newLat = ambulance.current_lat + (Math.random() - 0.3) * 0.001;
      const newLng = ambulance.current_lng + (Math.random() - 0.3) * 0.001;
      const heading = Math.random() * 360;
      const speed = 40 + Math.random() * 30;
      updateLocation(newLat, newLng, heading, speed);
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, ambulance]);

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setPickupLocation({ lat, lng, address });
  };

  const handleCreateToken = async () => {
    if (!ambulance || !pickupLocation) return;

    setIsCreatingToken(true);
    try {
      const token = await createToken(
        ambulance.id,
        pickupLocation.lat,
        pickupLocation.lng,
        pickupLocation.address,
        ambulance.current_lat,
        ambulance.current_lng
      );

      if (token) {
        toast.success(`Token Created: ${token.token_code}`, {
          description: 'Waiting for hospital to assign hospital & route...',
        });
        setShowLocationPicker(false);
        setPickupLocation(null);
      } else {
        toast.error('Failed to create emergency token');
      }
    } catch (error) {
      console.error('Token creation error:', error);
      toast.error('Failed to create emergency token');
    } finally {
      setIsCreatingToken(false);
    }
  };

  const handleStartJourney = async () => {
    if (!activeToken) return;

    const success = await startJourney(activeToken.id);
    if (success) {
      toast.success('Journey Started!', {
        description: 'Heading to patient location. Green corridor is now active.'
      });
    }
  };

  const handleArrivedAtPatient = async () => {
    if (!activeToken) return;

    const success = await arrivedAtPatient(activeToken.id);
    if (success) {
      toast.success('Arrived at Patient Location!', {
        description: 'Patient pickup confirmed.'
      });
    }
  };

  const handleStartToHospital = async () => {
    if (!activeToken) return;

    const success = await startToHospital(activeToken.id);
    if (success) {
      toast.success('Heading to Hospital!', {
        description: 'Green corridor active for hospital route.'
      });
    }
  };

  const handleCompleteEmergency = async () => {
    if (!activeToken || !ambulance) return;

    const success = await completeEmergency(activeToken.id, ambulance.id);
    if (success) {
      toast.success('Arrived at Hospital - Emergency Completed!');
    }
  };

  const handleCancelEmergency = async () => {
    if (!activeToken || !ambulance) return;

    const success = await cancelEmergency(activeToken.id, ambulance.id);
    if (success) {
      toast.info('Emergency Cancelled');
    }
  };

  const openGoogleMaps = (route: { coordinates: [number, number][] } | null, origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
    if (!route?.coordinates?.length) return;
    
    const originStr = `${origin.lat},${origin.lng}`;
    const destinationStr = `${destination.lat},${destination.lng}`;
    
    const waypoints = route.coordinates
      .filter((_, i) => i > 0 && i < route.coordinates.length - 1 && i % 5 === 0)
      .slice(0, 8)
      .map(coord => `${coord[0]},${coord[1]}`)
      .join('|');
    
    let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destinationStr}&travelmode=driving`;
    if (waypoints) {
      googleMapsUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    
    window.open(googleMapsUrl, '_blank');
  };

  if (authLoading || ambLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasActiveEmergency = !!activeToken;
  const isPendingAssignment = activeToken?.status === 'pending';
  const isAccepted = activeToken?.status === 'assigned';
  const hasRouteSelected = activeToken?.status === 'route_selected';
  const isGoingToPatient = activeToken?.status === 'in_progress';
  const isAtPatient = activeToken?.status === 'at_patient';
  const isGoingToHospital = activeToken?.status === 'to_hospital';
  const showNavToPatient =
  activeToken?.status === 'route_selected' ||
  activeToken?.status === 'in_progress';

  const showNavToHospital =
  activeToken?.status === 'at_patient' ||
  activeToken?.status === 'to_hospital';


  // Get current route based on status - show route whenever available
  const getCurrentRoute = () => {
    // When heading to hospital, show hospital route
    if (isGoingToHospital) {
      return activeToken?.route_to_hospital;
    }
    // For all other active states (including pending/assigned if route exists), show patient route
    if (activeToken?.route_to_patient) {
      return activeToken.route_to_patient;
    }
    // Fallback to selected_route for legacy compatibility
    return activeToken?.selected_route || null;
  };

  // Build map markers
  const mapMarkers = [
    ...(ambulance ? [{
      position: [ambulance.current_lat, ambulance.current_lng] as [number, number],
      popup: `Ambulance ${ambulance.vehicle_number}`,
      icon: 'ambulance' as const
    }] : []),
    ...signals.map(signal => ({
      position: [signal.location_lat, signal.location_lng] as [number, number],
      popup: signal.signal_name,
      icon: 'signal' as const
    })),
    ...(activeToken?.pickup_lat && activeToken?.pickup_lng ? [{
      position: [activeToken.pickup_lat, activeToken.pickup_lng] as [number, number],
      popup: 'Patient Pickup',
      icon: 'signal' as const
    }] : []),
    ...(activeToken?.hospital_lat && activeToken?.hospital_lng ? [{
      position: [activeToken.hospital_lat, activeToken.hospital_lng] as [number, number],
      popup: activeToken.hospital_name || 'Hospital',
      icon: 'hospital' as const
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className={`border-b px-4 py-3 transition-colors ${hasActiveEmergency ? 'bg-emergency/10 border-emergency/30' : 'bg-card border-border'}`}>
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertTriangle className={`w-5 h-5 sm:w-6 sm:h-6 ${hasActiveEmergency ? 'text-emergency animate-pulse' : 'text-muted-foreground'}`} />
            <div>
              <span className="font-bold text-sm sm:text-base">Ambulance Dashboard</span>
              <Badge variant="outline" className="ml-2 text-xs">{ambulance?.vehicle_number}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/')} className="hidden sm:inline-flex">
              Dashboard
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground hidden md:block">{profile?.full_name || profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Sign Out</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* ================= MEDIBOT FLOATING AI ASSISTANT ================= */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <MediBot />
      </div>

        {/* Active Emergency Token Display */}
        {hasActiveEmergency && (
          <Card className="border-emergency shadow-emergency">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-emergency" />
                    Emergency Token: {activeToken.token_code}
                  </CardTitle>
                  <CardDescription>
                    {isPendingAssignment && 'Waiting for hospital to assign route...'}
                    {isAccepted && 'Accepted by hospital. Awaiting routes...'}
                    {hasRouteSelected && 'Routes received! Ready to start journey to patient.'}
                    {isGoingToPatient && '🚑 Heading to patient location...'}
                    {isAtPatient && '✅ Arrived at patient location - Ready to go to hospital'}
                    {isGoingToHospital && '🏥 Heading to hospital...'}
                  </CardDescription>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {isPendingAssignment && (
                      <Badge
                        variant="outline"
                        className="animate-pulse bg-warning/15 text-warning border-warning/30"
                      >
                        ⏳ PENDING
                      </Badge>
                    )}
                    {isAccepted && (
                      <Badge variant="outline" className="bg-accent/15 text-accent border-accent/30">
                        ✓ ACCEPTED
                      </Badge>
                    )}
                    {hasRouteSelected && (
                      <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                        ✓ ROUTE ASSIGNED
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge variant={isGoingToPatient || isGoingToHospital ? 'destructive' : isAtPatient ? 'default' : 'secondary'} className="text-base">
                  {activeToken.status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Journey Progress */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isGoingToPatient ? 'bg-blue-500 text-white' : isAtPatient || isGoingToHospital ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  <User className="w-4 h-4" />
                </div>
                <div className={`flex-1 h-1 ${isAtPatient || isGoingToHospital ? 'bg-green-500' : 'bg-muted'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isGoingToHospital ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className={`p-3 rounded-lg ${isGoingToPatient ? 'bg-blue-500/10 border border-blue-500/30' : isAtPatient || isGoingToHospital ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted/50'}`}>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Patient Location
                    {(isAtPatient || isGoingToHospital) && <Badge variant="outline" className="ml-2 text-green-600">✓ Picked Up</Badge>}
                  </p>
                  <p className="font-medium text-sm line-clamp-2">
                    {activeToken.pickup_address || `${activeToken.pickup_lat.toFixed(4)}, ${activeToken.pickup_lng.toFixed(4)}`}
                  </p>
                  {activeToken.route_to_patient && (
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{((activeToken.route_to_patient_distance_meters || 0) / 1000).toFixed(1)} km</span>
                      <span>•</span>
                      <span>{Math.floor((activeToken.route_to_patient_duration_seconds || 0) / 60)} min</span>
                    </div>
                  )}
                </div>
                {activeToken.hospital_name && (
                  <div className={`p-3 rounded-lg ${isGoingToHospital ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-muted/50'}`}>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      Destination Hospital
                    </p>
                    <p className="font-medium">{activeToken.hospital_name}</p>
                    {activeToken.route_to_hospital && (
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{((activeToken.route_to_hospital_distance_meters || 0) / 1000).toFixed(1)} km</span>
                        <span>•</span>
                        <span>{Math.floor((activeToken.route_to_hospital_duration_seconds || 0) / 60)} min</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Route Navigation Buttons - Always show when routes are available */}
               <div className="space-y-3 mb-4">

              {/* NAVIGATE TO PATIENT */}
              {showNavToPatient && activeToken.route_to_patient && (
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-700">🚑 Route to Patient</p>
                      <p className="text-xs text-blue-700/70">
                        {activeToken.pickup_address}
                      </p>
                    </div>

                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                      onClick={() => openGoogleMaps(
                        activeToken.route_to_patient,
                        { lat: ambulance?.current_lat || 0, lng: ambulance?.current_lng || 0 },
                        { lat: activeToken.pickup_lat, lng: activeToken.pickup_lng }
                      )}
                    >
                      Navigate to Patient
                    </Button>
                  </div>
                </div>
              )}


              {/* NAVIGATE TO HOSPITAL */}
              {showNavToHospital && activeToken.route_to_hospital && (
              <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/10 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-700">🏥 Route to Hospital</p>
                    <p className="text-xs text-green-700/70">
                      {activeToken.hospital_name}
                    </p>
                  </div>

                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                    onClick={() => openGoogleMaps(
                      activeToken.route_to_hospital,
                      { lat: activeToken.pickup_lat, lng: activeToken.pickup_lng },
                      { lat: activeToken.hospital_lat || 0, lng: activeToken.hospital_lng || 0 }
                    )}
                  >
                    Navigate to Hospital
                  </Button>
                </div>
              </div>
            )}

              </div>


              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                {hasRouteSelected && (
                  <Button variant="emergency" size="lg" onClick={handleStartJourney} className="w-full sm:w-auto">
                    <Play className="w-5 h-5 mr-2" />
                    <span className="hidden sm:inline">START JOURNEY TO PATIENT</span>
                    <span className="sm:hidden">START JOURNEY</span>
                  </Button>
                )}
                {isGoingToPatient && (
                  <Button variant="default" size="lg" onClick={handleArrivedAtPatient} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="hidden sm:inline">ARRIVED AT PATIENT</span>
                    <span className="sm:hidden">ARRIVED</span>
                  </Button>
                )}
                {isAtPatient && (
                  <Button variant="emergency" size="lg" onClick={handleStartToHospital} className="w-full sm:w-auto">
                    <Play className="w-5 h-5 mr-2" />
                    <span className="hidden sm:inline">START TO HOSPITAL</span>
                    <span className="sm:hidden">TO HOSPITAL</span>
                  </Button>
                )}
                {isGoingToHospital && (
                  <Button variant="default" size="lg" onClick={handleCompleteEmergency} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="hidden sm:inline">ARRIVED AT HOSPITAL</span>
                    <span className="sm:hidden">ARRIVED</span>
                  </Button>
                )}
                <Button variant="outline" onClick={handleCancelEmergency} className="w-full sm:w-auto">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Traffic Signal Status Panel - Only show when driver is on duty (active emergency) */}
        {ambulance && hasActiveEmergency && (
          <TrafficSignalStatusPanel
            signals={signals}
            ambulance={ambulance}
            isActive={hasActiveEmergency}
          />
        )}

        {/* Create New Emergency */}
        {!hasActiveEmergency && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-5 h-5" />
                New Emergency
              </CardTitle>
              <CardDescription>
                Received a patient call? Enter their pickup location to generate an emergency token.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showLocationPicker ? (
                <Button
                  variant="emergency"
                  size="xl"
                  className="w-full sm:w-auto min-w-[200px]"
                  onClick={() => setShowLocationPicker(true)}
                >
                  <Power className="w-5 h-5 mr-2" />
                  CREATE EMERGENCY
                </Button>
              ) : (
                <div className="space-y-4">
                  <LocationPicker
                    onLocationSelect={handleLocationSelect}
                    initialLat={ambulance?.current_lat || 30.7333}
                    initialLng={ambulance?.current_lng || 76.7794}
                  />

                  <div className="flex gap-3">
                    <Button
                      onClick={handleCreateToken}
                      disabled={!pickupLocation || isCreatingToken}
                      className="flex-1"
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      {isCreatingToken ? 'Creating...' : 'Generate Emergency Token'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowLocationPicker(false);
                        setPickupLocation(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Location & Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5" />
                Current Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Latitude</p>
                  <p className="font-mono text-sm sm:text-lg">{ambulance?.current_lat?.toFixed(6) ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Longitude</p>
                  <p className="font-mono text-sm sm:text-lg">{ambulance?.current_lng?.toFixed(6) ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Speed</p>
                  <p className="font-mono text-sm sm:text-lg">{ambulance?.speed?.toFixed(0) ?? 0} km/h</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Heading</p>
                  <p className="font-mono text-sm sm:text-lg">{ambulance?.heading?.toFixed(0) ?? 0}°</p>
                </div>
              </div>
            
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={isSimulating ? 'destructive' : 'outline'}
                  onClick={isSimulating ? stopSimulation : startSimulation}
                  className="text-xs sm:text-sm"
                >
                  {isSimulating ? 'Stop Simulation' : 'Simulate Movement'}
                </Button>
              </div>
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  🚑 Ambulance Health (Live)
                  <Badge variant="outline" className="text-green-600">REAL-TIME</Badge>
                </CardTitle>
                <CardDescription>
                  Live sensor data from ambulance
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Fuel */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>⛽ Fuel Level</span>
                    <span>{ambulance?.vehicle_health?.fuel_percent ?? 70}%</span>
                  </div>
                  <div className="h-2 rounded bg-muted">
                    <div
                      className="h-2 rounded bg-green-500"
                      style={{ width: `${ambulance?.vehicle_health?.fuel_percent ?? 70}%` }}
                    />
                  </div>
                </div>

                {/* Battery */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>🔋 Battery</span>
                    <span>{ambulance?.vehicle_health?.battery_percent ?? 85}%</span>
                  </div>
                  <div className="h-2 rounded bg-muted">
                    <div
                      className="h-2 rounded bg-blue-500"
                      style={{ width: `${ambulance?.vehicle_health?.battery_percent ?? 85}%` }}
                    />
                  </div>
                </div>

                {/* Oxygen */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>🫁 Oxygen Cylinder</span>
                    <span>{ambulance?.vehicle_health?.oxygen_percent ?? 60}%</span>
                  </div>
                  <div className="h-2 rounded bg-muted">
                    <div
                      className={`h-2 rounded ${
                        (ambulance?.vehicle_health?.oxygen_percent ?? 60) < 30
                          ? 'bg-red-500'
                          : 'bg-cyan-500'
                      }`}
                      style={{ width: `${ambulance?.vehicle_health?.oxygen_percent ?? 60}%` }}
                    />
                  </div>
                </div>

                {/* Tyre Pressure */}
                <div>
                  <p className="text-sm font-medium mb-2">🛞 Tyre Pressure (PSI)</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 p-2 rounded">
                      FL: {ambulance?.vehicle_health?.tyres?.front_left ?? 32} PSI
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                      FR: {ambulance?.vehicle_health?.tyres?.front_right ?? 31} PSI
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                      RL: {ambulance?.vehicle_health?.tyres?.rear_left ?? 33} PSI
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                      RR: {ambulance?.vehicle_health?.tyres?.rear_right ?? 32} PSI
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Navigation className="w-5 h-5" />
                Live Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square w-full rounded-lg overflow-hidden border">
                <Map
                  center={ambulance ? [ambulance.current_lat, ambulance.current_lng] : [30.7333, 76.7794]}
                  zoom={14}
                  markers={mapMarkers}
                  route={getCurrentRoute()?.coordinates}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    
  );
}