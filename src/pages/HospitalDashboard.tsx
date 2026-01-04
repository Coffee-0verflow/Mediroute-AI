import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAmbulanceRealtime } from '@/hooks/useAmbulanceRealtime';
import { useTrafficSignals } from '@/hooks/useTrafficSignals';
import { useEmergencyTokens, RouteData } from '@/hooks/useEmergencyTokens';
import { useHospitals, Hospital } from '@/hooks/useHospitals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  MapPin, 
  LogOut, 
  Navigation, 
  AlertTriangle, 
  Radio,
  LayoutDashboard,
  Ambulance,
  FileText,
  Map as MapIcon,
  Clock,
  RefreshCw,
  Eye,
  Ticket,
  Route,
  User,
  XCircle,
  Phone,
  Plus,
  Unlock
} from 'lucide-react';
import Map from '@/components/Map';
import TwoLegRouteMap from '@/components/TwoLegRouteMap';
import HospitalEmergencyCreator from '@/components/HospitalEmergencyCreator';
import { toast } from 'sonner';

type NavItem = 'dashboard' | 'ambulances' | 'tokens' | 'livemap' | 'create-emergency';

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { ambulances, activeEmergencies, loading: ambLoading } = useAmbulanceRealtime();
  const { signals } = useTrafficSignals();
  const { pendingTokens, assignedTokens, activeTokens, assignHospitalWithRoutes, declineEmergency, createHospitalEmergency, releaseAmbulance } = useEmergencyTokens();
  const { hospitals, loading: hospitalsLoading } = useHospitals();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard');
  const [selectedTokenForRoute, setSelectedTokenForRoute] = useState<string | null>(null);
  const [declineTokenId, setDeclineTokenId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>(null);

  const navItems = [
    { id: 'dashboard' as NavItem, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'create-emergency' as NavItem, icon: Phone, label: 'Create Emergency' },
    { id: 'tokens' as NavItem, icon: Ticket, label: `Tokens (${pendingTokens.length + assignedTokens.length})` },
    { id: 'ambulances' as NavItem, icon: Ambulance, label: 'Ambulances' },
    { id: 'livemap' as NavItem, icon: MapIcon, label: 'Live Map' },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (authLoading || ambLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleRouteSelect = async (
    selectedHospital: Hospital,
    routeToPatient: RouteData,
    routeToHospital: RouteData
  ) => {
    if (!selectedTokenForRoute) {
      toast.error('No token selected');
      return;
    }
    if (!user) {
      toast.error('You must be logged in as a hospital to share routes');
      return;
    }

    try {
      const success = await assignHospitalWithRoutes(
        selectedTokenForRoute,
        user.id,
        selectedHospital.organization_name,
        selectedHospital.location_lat,
        selectedHospital.location_lng,
        routeToPatient,
        routeToHospital
      );
      
      if (success) {
        toast.success('Routes shared with ambulance!', {
          description: `Ambulance will first go to patient, then to ${selectedHospital.organization_name}`
        });
        setSelectedTokenForRoute(null);
        setActiveNav('dashboard');
      } else {
        toast.error('Failed to share routes. Please try again.');
      }
    } catch (error) {
      console.error('Error sharing routes:', error);
      toast.error('Failed to share routes. Please try again.');
    }
  };

  const handleDeclineToken = async () => {
    if (!declineTokenId || !declineReason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }
    
    const success = await declineEmergency(declineTokenId, declineReason);
    if (success) {
      toast.success('Emergency request declined', {
        description: 'The ambulance has been notified.'
      });
      setDeclineTokenId(null);
      setDeclineReason('');
    } else {
      toast.error('Failed to decline request');
    }
  };

  // Handle hospital-initiated emergency creation
  const handleCreateHospitalEmergency = async (
    ambulance: { id: string; vehicle_number: string; current_lat: number | null; current_lng: number | null },
    pickupLat: number,
    pickupLng: number,
    pickupAddress: string | undefined,
    hospital: Hospital,
    routeToPatient: RouteData,
    routeToHospital: RouteData
  ) => {
    if (!ambulance.current_lat || !ambulance.current_lng) {
      toast.error('Ambulance location not available');
      return;
    }
    if (!user) {
      toast.error('You must be logged in as a hospital to create emergencies');
      return;
    }

    const token = await createHospitalEmergency(
      ambulance.id,
      ambulance.current_lat,
      ambulance.current_lng,
      pickupLat,
      pickupLng,
      pickupAddress,
      user.id,
      hospital.organization_name,
      hospital.location_lat,
      hospital.location_lng,
      routeToPatient,
      routeToHospital
    );

    if (token) {
      toast.success(`Emergency Created: ${token.token_code}`, {
        description: `${ambulance.vehicle_number} dispatched to patient → ${hospital.organization_name}`
      });
      setActiveNav('dashboard');
    } else {
      toast.error('Failed to create emergency');
    }
  };

  // Handle releasing an on-duty ambulance back to available
  const handleReleaseAmbulance = async (ambulanceId: string, vehicleNumber: string) => {
    const success = await releaseAmbulance(ambulanceId);
    if (success) {
      toast.success(`${vehicleNumber} Released`, {
        description: 'Ambulance is now available for new emergencies.'
      });
    } else {
      toast.error('Failed to release ambulance');
    }
  };

  const selectedToken = [...pendingTokens, ...assignedTokens].find(t => t.id === selectedTokenForRoute);

  // Get ambulance location for the selected token
  const getAmbulanceForToken = (tokenId: string) => {
    const token = [...pendingTokens, ...assignedTokens].find(t => t.id === tokenId);
    if (!token) return null;
    return ambulances.find(a => a.id === token.ambulance_id);
  };

  const renderContent = () => {
    // Route Selection View
    if (selectedTokenForRoute && selectedToken) {
      const ambulance = getAmbulanceForToken(selectedTokenForRoute);
      const ambulanceLat = selectedToken.ambulance_origin_lat || ambulance?.current_lat || 30.7333;
      const ambulanceLng = selectedToken.ambulance_origin_lng || ambulance?.current_lng || 76.7794;

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Assign Route for Token: {selectedToken.token_code}</h2>
              <p className="text-sm text-muted-foreground">Select a hospital to calculate the best routes</p>
            </div>
            <Button variant="outline" onClick={() => setSelectedTokenForRoute(null)}>
              Back
            </Button>
          </div>

          {/* Token Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Ambulance className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ambulance Location</p>
                    <p className="font-medium text-sm">{ambulanceLat.toFixed(4)}, {ambulanceLng.toFixed(4)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Patient Pickup</p>
                    <p className="font-medium text-sm">{selectedToken.pickup_address || `${selectedToken.pickup_lat.toFixed(4)}, ${selectedToken.pickup_lng.toFixed(4)}`}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <TwoLegRouteMap
            ambulanceLat={ambulanceLat}
            ambulanceLng={ambulanceLng}
            pickupLat={selectedToken.pickup_lat}
            pickupLng={selectedToken.pickup_lng}
            hospitals={hospitals}
            onRouteSelect={handleRouteSelect}
          />
        </div>
      );
    }

    switch (activeNav) {
      case 'create-emergency':
        return (
          <HospitalEmergencyCreator
            ambulances={ambulances}
            hospitals={hospitals}
            onCreateEmergency={handleCreateHospitalEmergency}
            onCancel={() => setActiveNav('dashboard')}
          />
        );
        
      case 'tokens':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Emergency Tokens</h2>
            
            {/* Pending Tokens */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge variant="destructive">{pendingTokens.length}</Badge>
                Pending Assignment
              </h3>
              {pendingTokens.length === 0 ? (
                <p className="text-muted-foreground text-sm">No pending tokens</p>
              ) : (
                <div className="grid gap-4">
                  {pendingTokens.map(token => (
                    <Card key={token.id} className="border-emergency/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <Badge variant="outline" className="text-lg font-mono">{token.token_code}</Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              Created: {new Date(token.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <Badge variant="destructive">PENDING</Badge>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground">Patient Pickup Location:</p>
                          <p className="font-medium text-sm">{token.pickup_address || `${token.pickup_lat.toFixed(4)}, ${token.pickup_lng.toFixed(4)}`}</p>
                        </div>
                        
                        {/* Decline reason input */}
                        {declineTokenId === token.id ? (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Please provide a reason for declining this emergency request..."
                              value={declineReason}
                              onChange={(e) => setDeclineReason(e.target.value)}
                              className="min-h-[80px]"
                            />
                            <div className="flex gap-2">
                              <Button 
                                variant="destructive" 
                                onClick={handleDeclineToken}
                                disabled={!declineReason.trim()}
                                className="flex-1"
                              >
                                Confirm Decline
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setDeclineTokenId(null);
                                  setDeclineReason('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button onClick={() => setSelectedTokenForRoute(token.id)} className="flex-1">
                              <Building2 className="w-4 h-4 mr-2" />
                              Assign Hospital & Route
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setDeclineTokenId(token.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Tokens (route selected) */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge>{assignedTokens.length}</Badge>
                Route Assigned
              </h3>
              {assignedTokens.map(token => (
                <Card key={token.id} className="border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="outline" className="text-lg font-mono">{token.token_code}</Badge>
                      <Badge className="bg-green-500">{token.status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>Patient: {token.pickup_address || `${token.pickup_lat.toFixed(4)}, ${token.pickup_lng.toFixed(4)}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>Hospital: {token.hospital_name}</span>
                      </div>
                    </div>
                    <p className="text-success text-sm mt-2">✓ Routes shared with ambulance</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Active Journeys */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge variant="secondary">{activeTokens.length}</Badge>
                Active Journeys
              </h3>
              {activeTokens.map(token => (
                <Card key={token.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="outline" className="text-lg font-mono">{token.token_code}</Badge>
                      <Badge variant="destructive">{token.status.replace(/_/g, ' ').toUpperCase()}</Badge>
                    </div>
                    <div className="grid gap-2 text-sm">
                      {token.status === 'in_progress' && (
                        <p className="text-blue-500">🚑 Ambulance heading to patient...</p>
                      )}
                      {token.status === 'at_patient' && (
                        <p className="text-green-500">✓ Ambulance arrived at patient location</p>
                      )}
                      {token.status === 'to_hospital' && (
                        <p className="text-blue-500">🏥 Ambulance heading to {token.hospital_name}...</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'ambulances': {
        const selectedAmbulance = ambulances.find(a => a.id === selectedAmbulanceId);

        // Consider an ambulance "on duty" either when its emergency status is active/responding
        // OR when it is currently involved in a token/journey.
        const tokenBusyAmbulanceIds = new Set(
          [...pendingTokens, ...assignedTokens, ...activeTokens]
            .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
            .map(t => t.ambulance_id)
        );

        const isOnDuty = (amb: (typeof ambulances)[number]) =>
          amb.emergency_status === 'active' ||
          amb.emergency_status === 'responding' ||
          tokenBusyAmbulanceIds.has(amb.id);

        const selectedOnDuty = !!selectedAmbulance && isOnDuty(selectedAmbulance);

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">All Ambulances ({ambulances.length})</h2>
              {selectedAmbulanceId && (
                <Button variant="outline" onClick={() => setSelectedAmbulanceId(null)}>
                  Back to List
                </Button>
              )}
            </div>

            {/* Live tracking indicator for on-duty ambulances */}
            {selectedAmbulance && selectedOnDuty && (
              <Card className="bg-destructive/10 border-destructive/30">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm font-medium text-destructive">
                    📍 LIVE TRACKING: {selectedAmbulance.vehicle_number} - Location updating in real-time
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Last update: {new Date(selectedAmbulance.last_updated).toLocaleTimeString()}
                  </span>
                </CardContent>
              </Card>
            )}

            {/* Map showing all ambulances with selected one highlighted */}
            <Card>
              <CardContent className="p-0">
                <div className="h-[350px] rounded-xl overflow-hidden">
                  <Map
                    center={
                      selectedAmbulance
                        ? [selectedAmbulance.current_lat || 30.7333, selectedAmbulance.current_lng || 76.7794]
                        : [30.7333, 76.7794]
                    }
                    zoom={selectedAmbulance ? 15 : 11}
                    // Follow whenever a user selects an ambulance ("live view"), regardless of status
                    followCenter={!!selectedAmbulance}
                    markers={ambulances.filter(a => a.current_lat).map(amb => ({
                      position: [amb.current_lat!, amb.current_lng!] as [number, number],
                      popup: `${amb.vehicle_number} - ${isOnDuty(amb) ? '🔴 On Duty' : '🟢 Available'}`,
                      icon: 'ambulance' as const,
                      highlighted: amb.id === selectedAmbulanceId
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-destructive border-2 border-yellow-400" />
                <span>Selected Ambulance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/70" />
                <span>Other Ambulances</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span>Live Tracking (On Duty)</span>
              </div>
            </div>

            {/* Selected Ambulance Details */}
            {selectedAmbulance ? (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedOnDuty ? 'bg-destructive/10' : 'bg-green-500/10'
                      }`}>
                        <Ambulance className={`w-6 h-6 ${selectedOnDuty ? 'text-destructive' : 'text-green-500'}`} />
                      </div>
                      <div>
                        <span className="text-lg">{selectedAmbulance.vehicle_number}</span>
                      </div>
                    </div>
                    {/* On Duty / Available Status Button */}
                    <div className={`px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 ${
                      selectedOnDuty ? 'bg-destructive text-destructive-foreground' : 'bg-green-500 text-white'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${selectedOnDuty ? 'bg-white animate-pulse' : 'bg-white'}`} />
                      {selectedOnDuty ? '🚨 ON DUTY' : '✅ AVAILABLE'}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Current Location</p>
                          <p className="font-medium text-sm">
                            {selectedAmbulance.current_lat?.toFixed(5)}, {selectedAmbulance.current_lng?.toFixed(5)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Navigation className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Speed</p>
                          <p className="font-medium text-sm">{selectedAmbulance.speed?.toFixed(0) || 0} km/h</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Route className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Heading</p>
                          <p className="font-medium text-sm">{selectedAmbulance.heading?.toFixed(0) || 0}°</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Last Updated</p>
                          <p className="font-medium text-sm">
                            {new Date(selectedAmbulance.last_updated).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      {selectedAmbulance.destination_name && (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Destination</p>
                            <p className="font-medium text-sm">{selectedAmbulance.destination_name}</p>
                          </div>
                        </div>
                      )}
                      {selectedAmbulance.route_direction && (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Navigation className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Route Direction</p>
                            <p className="font-medium text-sm">{selectedAmbulance.route_direction.replace('_', ' → ')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Release Ambulance Button - Only show when on duty */}
                  {selectedOnDuty && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        className="w-full text-warning border-warning hover:bg-warning hover:text-warning-foreground"
                        onClick={() => handleReleaseAmbulance(selectedAmbulance.id, selectedAmbulance.vehicle_number)}
                      >
                        <Unlock className="w-4 h-4 mr-2" />
                        Release Ambulance (Make Available)
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        This will cancel any active emergency and make the ambulance available for new assignments.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Ambulance List */
              <div className="grid gap-3">
                {ambulances.map((amb) => {
                  const onDuty = isOnDuty(amb);

                  return (
                    <Card
                      key={amb.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedAmbulanceId(amb.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              onDuty ? 'bg-destructive/10' : 'bg-green-500/10'
                            }`}>
                              <Ambulance className={`w-5 h-5 ${onDuty ? 'text-destructive' : 'text-green-500'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{amb.vehicle_number}</span>
                                {onDuty && (
                                  <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-medium animate-pulse">
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {onDuty
                                  ? `📍 Tracking live • ${new Date(amb.last_updated).toLocaleTimeString()}`
                                  : `Last seen: ${new Date(amb.last_updated).toLocaleTimeString()}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-medium">{amb.speed?.toFixed(0) || 0} km/h</p>
                              <p className="text-xs text-muted-foreground">
                                {amb.current_lat?.toFixed(3)}, {amb.current_lng?.toFixed(3)}
                              </p>
                            </div>
                            {/* Status indicator button */}
                            <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                              onDuty ? 'bg-destructive text-destructive-foreground' : 'bg-green-500 text-white'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full bg-white ${onDuty ? 'animate-pulse' : ''}`} />
                              {onDuty ? 'ON DUTY' : 'AVAILABLE'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'livemap':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Live Map</h2>
            <Card>
              <CardContent className="p-0">
                <div className="h-[calc(100vh-200px)] rounded-xl overflow-hidden">
                  <Map 
                    center={[27.5, 76.0]}
                    zoom={5}
                    markers={[
                      // Hospital markers
                      ...hospitals.map(h => ({
                        position: [h.location_lat || 30.7333, h.location_lng || 76.7794] as [number, number],
                        popup: h.organization_name,
                        icon: 'hospital' as const
                      })),
                      // Ambulance markers
                      ...ambulances.filter(a => a.current_lat).map(amb => ({
                        position: [amb.current_lat!, amb.current_lng!] as [number, number],
                        popup: amb.vehicle_number,
                        icon: 'ambulance' as const
                      })),
                      // Signal markers
                      ...signals.map(s => ({
                        position: [s.location_lat, s.location_lng] as [number, number],
                        popup: s.signal_name,
                        icon: 'signal' as const
                      }))
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-emergency/10 border-emergency/20">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Pending Tokens</p>
                  <p className="text-3xl font-bold">{pendingTokens.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Active Journeys</p>
                  <p className="text-3xl font-bold">{activeTokens.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-success/10 border-success/20">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Available Ambulances</p>
                  <p className="text-3xl font-bold">{ambulances.filter(a => a.emergency_status === 'inactive').length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Hospitals</p>
                  <p className="text-3xl font-bold">{hospitals.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Tokens Alert */}
            {pendingTokens.length > 0 && (
              <Card className="border-emergency bg-emergency/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emergency">
                    <AlertTriangle className="w-5 h-5" />
                    {pendingTokens.length} Pending Emergency Token{pendingTokens.length > 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setActiveNav('tokens')} variant="emergency">
                    Review Tokens
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Active Journeys Overview */}
            {activeTokens.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ambulance className="w-5 h-5" />
                    Active Journeys
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeTokens.map(token => (
                      <div key={token.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">{token.token_code}</Badge>
                          <span className="text-sm">→ {token.hospital_name}</span>
                        </div>
                        <Badge variant={token.status === 'at_patient' ? 'default' : 'destructive'}>
                          {token.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Navigation */}
      <div className="md:hidden border-b bg-card">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">Hospital Control</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
        <div className="px-4 pb-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-xs transition-colors ${
                  activeNav === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:block">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            <span className="font-bold">Hospital Control</span>
          </div>
        </div>
        <nav className="p-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeNav === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1">
        <header className="border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <h1 className="text-lg sm:text-xl font-bold truncate">{profile?.organization_name || 'Hospital Dashboard'}</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{currentTime.toLocaleTimeString()}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:flex">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>
        <div className="p-3 sm:p-4 md:p-6">{renderContent()}</div>
      </main>
    </div>
  );
}