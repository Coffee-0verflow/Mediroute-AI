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
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Unlock,
  Settings,
  Bed,
  Activity,
  Heart
} from 'lucide-react';
import Map from '@/components/Map';
import TwoLegRouteMap from '@/components/TwoLegRouteMap';
import HospitalEmergencyCreator from '@/components/HospitalEmergencyCreator';
import EmergencyDisplay from '@/components/EmergencyDisplay';
import HospitalSpecialtyManager from '@/components/HospitalSpecialtyManager';
import AmbulanceFleetManagement from '@/components/AmbulanceFleetManagement';
import { toast } from 'sonner';

type NavItem = 'dashboard' | 'ambulances' | 'tokens' | 'livemap' | 'create-emergency' | 'specialties' | 'hospitals' | 'network';

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
  const [selectedTokenForDisplay, setSelectedTokenForDisplay] = useState<string | null>(null);
  const [declineTokenId, setDeclineTokenId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [hospitalForm, setHospitalForm] = useState({
    name: '',
    address: '',
    region: '',
    latitude: '',
    longitude: ''
  });
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>(null);

  const navItems = [
    { id: 'dashboard' as NavItem, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'network' as NavItem, icon: Activity, label: 'Hospital Network' },
    { id: 'create-emergency' as NavItem, icon: Phone, label: 'Create Emergency' },
    { id: 'tokens' as NavItem, icon: Ticket, label: `Tokens (${pendingTokens.length + assignedTokens.length})` },
    { id: 'ambulances' as NavItem, icon: Ambulance, label: 'Ambulances' },
    { id: 'hospitals' as NavItem, icon: Building2, label: 'Hospital Management' },
    { id: 'specialties' as NavItem, icon: Settings, label: 'Specialties' },
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
    routeToHospital: RouteData,
    emergencyType: string,
    medicalKeyword: string
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
      routeToHospital,
      emergencyType,
      medicalKeyword
    );

    if (token) {
      toast.success(`${emergencyType} Emergency Created: ${token.token_code}`, {
        description: `${ambulance.vehicle_number} dispatched to ${medicalKeyword} emergency → ${hospital.organization_name}`
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

  // Get unique regions from hospitals (excluding 'all' and 'Unknown')
  const existingRegions = [...new Set(hospitals.map(h => h.address?.split(',').pop()?.trim()).filter(r => r && r !== 'Unknown'))];
  const regions = ['all', ...existingRegions];
  
  // Predefined regions for hospital creation
  const availableRegions = ['Punjab', 'Haryana', 'Delhi', 'Rajasthan', 'Uttar Pradesh', 'Himachal Pradesh', ...existingRegions].filter((r, i, arr) => arr.indexOf(r) === i);
  
  // Filter hospitals by selected region
  const filteredHospitals = selectedRegion === 'all' 
    ? hospitals 
    : hospitals.filter(h => h.address?.includes(selectedRegion));

  // Mock hospital capacity data (in real app, this would come from API)
  const getHospitalCapacity = (hospitalId: string) => {
    const mockData = {
      totalBeds: Math.floor(Math.random() * 200) + 50,
      icuBeds: Math.floor(Math.random() * 30) + 10,
    };
    const occupiedBeds = Math.floor(mockData.totalBeds * (0.3 + Math.random() * 0.6));
    const occupiedICU = Math.floor(mockData.icuBeds * (0.2 + Math.random() * 0.7));
    const occupancyRate = Math.round((occupiedBeds / mockData.totalBeds) * 100);
    
    return {
      ...mockData,
      occupiedBeds,
      availableBeds: mockData.totalBeds - occupiedBeds,
      occupiedICU,
      availableICU: mockData.icuBeds - occupiedICU,
      occupancyRate,
      loadLevel: occupancyRate < 60 ? 'low' : occupancyRate < 85 ? 'moderate' : 'critical',
      incomingAmbulances: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0
    };
  };

  // Calculate network totals
  const networkStats = hospitals.reduce((acc, hospital) => {
    const capacity = getHospitalCapacity(hospital.id);
    return {
      totalBeds: acc.totalBeds + capacity.totalBeds,
      availableBeds: acc.availableBeds + capacity.availableBeds,
      totalICU: acc.totalICU + capacity.icuBeds,
      availableICU: acc.availableICU + capacity.availableICU,
      incomingAmbulances: acc.incomingAmbulances + capacity.incomingAmbulances
    };
  }, { totalBeds: 0, availableBeds: 0, totalICU: 0, availableICU: 0, incomingAmbulances: 0 });

  const networkOccupancyRate = networkStats.totalBeds > 0 
    ? Math.round(((networkStats.totalBeds - networkStats.availableBeds) / networkStats.totalBeds) * 100)
    : 0;

  const handleAddHospital = async () => {
    if (!hospitalForm.name || !hospitalForm.address || !hospitalForm.region || !hospitalForm.latitude || !hospitalForm.longitude) {
      toast.error('Please fill all fields');
      return;
    }

    const lat = parseFloat(hospitalForm.latitude);
    const lng = parseFloat(hospitalForm.longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Please enter valid coordinates');
      return;
    }

    // Here you would typically call an API to add the hospital
    // For now, just show success message
    toast.success('Hospital added successfully!', {
      description: `${hospitalForm.name} in ${hospitalForm.region}`
    });
    
    // Reset form
    setHospitalForm({ name: '', address: '', region: '', latitude: '', longitude: '' });
    setShowAddHospital(false);
  };

  const selectedToken = [...pendingTokens, ...assignedTokens].find(t => t.id === selectedTokenForRoute);

  // Get ambulance location for the selected token
  const getAmbulanceForToken = (tokenId: string) => {
    const token = [...pendingTokens, ...assignedTokens].find(t => t.id === tokenId);
    if (!token) return null;
    return ambulances.find(a => a.id === token.ambulance_id);
  };

  const renderContent = () => {

    // Route Selection View (shows Emergency Analysis & Assignment)
    if (selectedTokenForRoute && selectedToken) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Emergency Analysis & Hospital Assignment</h2>
            <Button variant="outline" onClick={() => setSelectedTokenForRoute(null)}>
              Back to Tokens
            </Button>
          </div>
          <EmergencyDisplay 
            token={selectedToken} 
            onAssignmentComplete={() => {
              setSelectedTokenForRoute(null);
              setActiveNav('dashboard');
            }}
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
                          {token.emergency_type && (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {token.emergency_type}
                              </Badge>
                              {token.medical_keyword && (
                                <Badge variant="secondary" className="text-xs">
                                  {token.medical_keyword}
                                </Badge>
                              )}
                            </div>
                          )}
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
                            <Button onClick={() => setSelectedTokenForRoute(token.id)} variant="secondary" className="flex-1">
                              <AlertTriangle className="w-4 h-4 mr-2" />
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
                      {token.emergency_type && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                          <span>Emergency: {token.emergency_type}</span>
                          {token.medical_keyword && (
                            <Badge variant="outline" className="text-xs ml-2">{token.medical_keyword}</Badge>
                          )}
                        </div>
                      )}
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
                      {token.emergency_type && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                          <span>Emergency: {token.emergency_type}</span>
                          {token.medical_keyword && (
                            <Badge variant="outline" className="text-xs ml-2">{token.medical_keyword}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'network':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Hospital Network Capacity</h2>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Network
              </Button>
            </div>
            
            {/* Network Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Bed className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-muted-foreground">Total Beds</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{networkStats.totalBeds}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Bed className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-muted-foreground">Available</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{networkStats.availableBeds}</p>
                </CardContent>
              </Card>
              
              <Card className={`${networkOccupancyRate < 60 ? 'bg-green-500/10 border-green-500/20' : networkOccupancyRate < 85 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Occupancy</span>
                  </div>
                  <p className={`text-2xl font-bold ${networkOccupancyRate < 60 ? 'text-green-400' : networkOccupancyRate < 85 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {networkOccupancyRate}%
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-500/10 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-muted-foreground">ICU Beds</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">{networkStats.totalICU}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-indigo-500/10 border-indigo-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm text-muted-foreground">ICU Available</span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-400">{networkStats.availableICU}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-orange-500/10 border-orange-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Ambulance className="w-5 h-5 text-orange-400" />
                    <span className="text-sm text-muted-foreground">Incoming</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-400">{networkStats.incomingAmbulances}</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Hospital List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold">Hospital Status</h3>
                <div className="space-y-3">
                  {hospitals.map(hospital => {
                    const capacity = getHospitalCapacity(hospital.id);
                    return (
                      <Card 
                        key={hospital.id} 
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          selectedHospitalId === hospital.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedHospitalId(hospital.id)}
                      >
                        <CardContent className="p-4">
                          {/* Incoming Ambulance Banner */}
                          {capacity.incomingAmbulances > 0 && (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 mb-3">
                              <div className="flex items-center gap-2">
                                <Ambulance className="w-4 h-4 text-orange-400 animate-pulse" />
                                <span className="text-sm text-orange-400 font-medium">
                                  {capacity.incomingAmbulances} ambulance{capacity.incomingAmbulances > 1 ? 's' : ''} incoming
                                </span>
                                <Badge variant="outline" className="text-xs">ETA: 8-12 min</Badge>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{hospital.organization_name}</h4>
                              <p className="text-sm text-muted-foreground">{hospital.address}</p>
                            </div>
                            <Badge 
                              variant={capacity.loadLevel === 'low' ? 'default' : capacity.loadLevel === 'moderate' ? 'secondary' : 'destructive'}
                              className={`${
                                capacity.loadLevel === 'low' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                capacity.loadLevel === 'moderate' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                'bg-red-500/20 text-red-400 border-red-500/30'
                              }`}
                            >
                              {capacity.loadLevel === 'low' ? 'Low Load' : capacity.loadLevel === 'moderate' ? 'Moderate Load' : 'Critical Load'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Total Beds</p>
                              <p className="font-semibold">{capacity.totalBeds}</p>
                            </div>
                            <div className="text-center bg-green-500/10 rounded p-2">
                              <p className="text-sm text-green-400">Available</p>
                              <p className="font-semibold text-green-400">{capacity.availableBeds}</p>
                            </div>
                            <div className="text-center bg-purple-500/10 rounded p-2">
                              <p className="text-sm text-purple-400">ICU Beds</p>
                              <p className="font-semibold text-purple-400">{capacity.icuBeds}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Occupancy</span>
                              <span>{capacity.occupancyRate}%</span>
                            </div>
                            <Progress 
                              value={capacity.occupancyRate} 
                              className={`h-2 ${
                                capacity.occupancyRate < 60 ? '[&>div]:bg-green-500' :
                                capacity.occupancyRate < 85 ? '[&>div]:bg-yellow-500' :
                                '[&>div]:bg-red-500'
                              }`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
              
              {/* Hospital Details Panel */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Hospital Details</h3>
                {selectedHospitalId ? (
                  (() => {
                    const hospital = hospitals.find(h => h.id === selectedHospitalId);
                    const capacity = getHospitalCapacity(selectedHospitalId);
                    return hospital ? (
                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <h4 className="font-semibold text-lg">{hospital.organization_name}</h4>
                            <p className="text-sm text-muted-foreground">{hospital.address}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-500/10 rounded p-3">
                              <p className="text-sm text-blue-400">Total Beds</p>
                              <p className="text-xl font-bold text-blue-400">{capacity.totalBeds}</p>
                            </div>
                            <div className="bg-green-500/10 rounded p-3">
                              <p className="text-sm text-green-400">Available</p>
                              <p className="text-xl font-bold text-green-400">{capacity.availableBeds}</p>
                            </div>
                            <div className="bg-purple-500/10 rounded p-3">
                              <p className="text-sm text-purple-400">ICU Total</p>
                              <p className="text-xl font-bold text-purple-400">{capacity.icuBeds}</p>
                            </div>
                            <div className="bg-indigo-500/10 rounded p-3">
                              <p className="text-sm text-indigo-400">ICU Available</p>
                              <p className="text-xl font-bold text-indigo-400">{capacity.availableICU}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h5 className="font-medium">Specialties</h5>
                            <div className="flex flex-wrap gap-1">
                              {['Emergency', 'Cardiology', 'Neurology', 'Orthopedics'].map(specialty => (
                                <Badge key={specialty} variant="outline" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null;
                  })()
                ) : (
                  <Card className="h-64">
                    <CardContent className="p-4 h-full flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Select a hospital to view details</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        );

      case 'hospitals':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Hospital Management</h2>
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowAddHospital(true)} className="mr-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Hospital
                </Button>
                <span className="text-sm text-muted-foreground">Region:</span>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.slice(1).map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Add Hospital Form */}
            {showAddHospital && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Add New Hospital</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddHospital(false)}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hospital-name">Hospital Name</Label>
                      <Input
                        id="hospital-name"
                        placeholder="Enter hospital name"
                        value={hospitalForm.name}
                        onChange={(e) => setHospitalForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hospital-region">Region</Label>
                      <Select value={hospitalForm.region} onValueChange={(value) => setHospitalForm(prev => ({ ...prev, region: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRegions.map(region => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="hospital-address">Full Address</Label>
                    <Textarea
                      id="hospital-address"
                      placeholder="Enter complete hospital address"
                      value={hospitalForm.address}
                      onChange={(e) => setHospitalForm(prev => ({ ...prev, address: e.target.value }))}
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hospital-lat">Latitude</Label>
                      <Input
                        id="hospital-lat"
                        type="number"
                        step="any"
                        placeholder="e.g., 30.7333"
                        value={hospitalForm.latitude}
                        onChange={(e) => setHospitalForm(prev => ({ ...prev, latitude: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hospital-lng">Longitude</Label>
                      <Input
                        id="hospital-lng"
                        type="number"
                        step="any"
                        placeholder="e.g., 76.7794"
                        value={hospitalForm.longitude}
                        onChange={(e) => setHospitalForm(prev => ({ ...prev, longitude: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleAddHospital} className="flex-1">
                      <Building2 className="w-4 h-4 mr-2" />
                      Add Hospital
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddHospital(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Hospitals in {selectedRegion === 'all' ? 'All Regions' : selectedRegion}
                    <Badge variant="secondary">{filteredHospitals.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredHospitals.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No hospitals found in selected region</p>
                  ) : (
                    <div className="grid gap-3">
                      {filteredHospitals.map(hospital => (
                        <Card key={hospital.id} className="border-muted">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{hospital.organization_name}</h3>
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  <MapPin className="w-4 h-4" />
                                  <span>{hospital.address}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline">
                                    {hospital.location_lat?.toFixed(4)}, {hospital.location_lng?.toFixed(4)}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {hospital.address?.split(',').pop()?.trim() || 'Unknown Region'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge variant="default">Active</Badge>
                                <span className="text-xs text-muted-foreground">
                                  ID: {hospital.id.slice(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'specialties':
        return <HospitalSpecialtyManager />;

      case 'ambulances': {
        return <AmbulanceFleetManagement />;
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