import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Shield, Power, Radio, MapPin, Ambulance, Building2, 
  BarChart3, Users, Settings, AlertTriangle, CheckCircle, 
  XCircle, Clock, TrendingUp, Activity, Zap, Lock, 
  Unlock, Eye, RotateCcw, LogOut, Bell, Map, UserPlus,
  RefreshCw, Link2, Trash2, User, Mail
} from 'lucide-react';
import { toast } from 'sonner';
import MapComponent from '@/components/Map';

interface DriverWithAmbulance {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_approved: boolean;
  ambulance_id: string | null;
  created_at: string;
  ambulance?: {
    id: string;
    vehicle_number: string;
    emergency_status: string;
  } | null;
}

interface SystemControl {
  id: string;
  system_enabled: boolean;
  emergency_broadcast: string | null;
  broadcast_active: boolean;
  updated_at: string;
}

interface TrafficZone {
  id: string;
  zone_name: string;
  zone_bounds: any;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
}

interface GreenCorridor {
  id: string;
  corridor_name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  route_coordinates: any;
  duration_minutes: number;
  is_active: boolean;
  activated_by: string | null;
  activated_at: string | null;
}

interface HospitalCapacity {
  id: string;
  hospital_id: string;
  hospital_name?: string;
  total_beds: number;
  occupied_beds: number;
  icu_beds: number;
  occupied_icu_beds: number;
  emergency_beds: number;
  occupied_emergency_beds: number;
  is_accepting_patients: boolean;
  last_updated: string;
}

interface SystemAnalytics {
  total_emergencies: number;
  avg_response_time_seconds: number;
  lives_saved_estimate: number;
  corridor_efficiency_percent: number;
  hospital_overload_rate: number;
  peak_emergency_zones: any[];
}

export default function AdminCommandCenter() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  
  // System Control State
  const [systemControl, setSystemControl] = useState<SystemControl | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  // Traffic & Corridors State
  const [trafficZones, setTrafficZones] = useState<TrafficZone[]>([]);
  const [greenCorridors, setGreenCorridors] = useState<GreenCorridor[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  
  // Fleet & Hospital State
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [hospitalCapacities, setHospitalCapacities] = useState<HospitalCapacity[]>([]);
  const [emergencyTokens, setEmergencyTokens] = useState<any[]>([]);
  
  // Analytics State
  const [analytics, setAnalytics] = useState<SystemAnalytics>({
    total_emergencies: 0,
    avg_response_time_seconds: 0,
    lives_saved_estimate: 0,
    corridor_efficiency_percent: 0,
    hospital_overload_rate: 0,
    peak_emergency_zones: []
  });
  
  // Driver Management State
  const [drivers, setDrivers] = useState<DriverWithAmbulance[]>([]);
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [creatingDriver, setCreatingDriver] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [loadingData, setLoadingData] = useState(true);

  // Auth check
  useEffect(() => {
    if (!loading && (!user || !['admin', 'super_admin'].includes(profile?.role || ''))) {
      toast.error('Access Denied - Admin privileges required');
      navigate('/');
    }
  }, [user, profile, loading, navigate]);

  // Load all data
  useEffect(() => {
    if (profile?.role && ['admin', 'super_admin'].includes(profile.role)) {
      loadAllData();
      
      // Set up real-time subscriptions
      const subscriptions = setupRealtimeSubscriptions();
      
      return () => {
        subscriptions.forEach(sub => sub.unsubscribe());
      };
    }
  }, [profile]);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      await Promise.all([
        loadSystemControl(),
        loadTrafficData(),
        loadFleetData(),
        loadHospitalData(),
        loadDriverData(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoadingData(false);
    }
  };

  const loadDriverData = async () => {
    const { data: driversData, error } = await supabase
      .from('profiles')
      .select(`
        *,
        ambulances!profiles_ambulance_id_fkey(id, vehicle_number, emergency_status)
      `)
      .eq('role', 'ambulance')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading drivers:', error);
      return;
    }

    const driversWithAmbulances = (driversData || []).map(driver => ({
      ...driver,
      ambulance: driver.ambulances || null
    }));

    setDrivers(driversWithAmbulances);
  };

  const loadSystemControl = async () => {
    const { data, error } = await supabase
      .from('system_control')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error loading system control:', error);
      return;
    }
    
    setSystemControl(data);
  };

  const loadTrafficData = async () => {
    const [zonesResult, corridorsResult, signalsResult] = await Promise.all([
      supabase.from('traffic_zones').select('*'),
      supabase.from('green_corridors').select('*'),
      supabase.from('traffic_signals').select('*')
    ]);
    
    if (zonesResult.data) setTrafficZones(zonesResult.data);
    if (corridorsResult.data) setGreenCorridors(corridorsResult.data);
    if (signalsResult.data) setSignals(signalsResult.data);
  };

  const loadFleetData = async () => {
    const [ambulancesResult, tokensResult] = await Promise.all([
      supabase.from('ambulances').select(`
        *,
        profiles!ambulances_driver_id_fkey(full_name, email)
      `),
      supabase.from('emergency_tokens').select('*').order('created_at', { ascending: false })
    ]);
    
    if (ambulancesResult.data) setAmbulances(ambulancesResult.data);
    if (tokensResult.data) setEmergencyTokens(tokensResult.data);
  };

  const loadHospitalData = async () => {
    const { data, error } = await supabase
      .from('hospital_capacity')
      .select(`
        *,
        hospitals!hospital_capacity_hospital_id_fkey(name)
      `);
    
    if (data) {
      const capacitiesWithNames = data.map(cap => ({
        ...cap,
        hospital_name: cap.hospitals?.name || 'Unknown Hospital'
      }));
      setHospitalCapacities(capacitiesWithNames);
    }
  };

  const loadAnalytics = async () => {
    // Calculate real-time analytics
    const today = new Date().toISOString().split('T')[0];
    
    const [emergenciesResult, avgResponseResult] = await Promise.all([
      supabase.from('emergency_tokens').select('*').gte('created_at', today),
      supabase.from('emergency_tokens').select('*').not('completed_at', 'is', null)
    ]);
    
    const totalEmergencies = emergenciesResult.data?.length || 0;
    const completedEmergencies = avgResponseResult.data || [];
    
    let avgResponseTime = 0;
    if (completedEmergencies.length > 0) {
      const totalResponseTime = completedEmergencies.reduce((sum, token) => {
        const created = new Date(token.created_at).getTime();
        const completed = new Date(token.completed_at).getTime();
        return sum + (completed - created);
      }, 0);
      avgResponseTime = Math.floor(totalResponseTime / completedEmergencies.length / 1000);
    }
    
    const livesSaved = Math.floor(totalEmergencies * 0.85); // Estimate
    const corridorEfficiency = Math.min(95, 60 + (totalEmergencies * 2)); // Dynamic efficiency
    const hospitalOverload = Math.min(100, (hospitalCapacities.reduce((sum, h) => 
      sum + (h.occupied_beds / Math.max(h.total_beds, 1)), 0) / Math.max(hospitalCapacities.length, 1)) * 100);
    
    setAnalytics({
      total_emergencies: totalEmergencies,
      avg_response_time_seconds: avgResponseTime,
      lives_saved_estimate: livesSaved,
      corridor_efficiency_percent: corridorEfficiency,
      hospital_overload_rate: hospitalOverload,
      peak_emergency_zones: []
    });
  };

  const setupRealtimeSubscriptions = () => {
    const subscriptions = [
      supabase.channel('ambulances').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'ambulances' }, 
        () => loadFleetData()
      ).subscribe(),
      
      supabase.channel('emergency_tokens').on('postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_tokens' },
        () => { loadFleetData(); loadAnalytics(); }
      ).subscribe(),
      
      supabase.channel('traffic_signals').on('postgres_changes',
        { event: '*', schema: 'public', table: 'traffic_signals' },
        () => loadTrafficData()
      ).subscribe(),
      
      supabase.channel('profiles').on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => loadDriverData()
      ).subscribe(),
      
      supabase.channel('hospital_capacity').on('postgres_changes',
        { event: '*', schema: 'public', table: 'hospital_capacity' },
        () => loadHospitalData()
      ).subscribe()
    ];
    
    return subscriptions;
  };

  // Driver Management Functions
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingDriver(true);

    try {
      const { data: currentSession } = await supabase.auth.getSession();
      const adminSession = currentSession.session;

      if (!adminSession) throw new Error('Admin session not found');

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newDriverEmail,
        password: newDriverPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: newDriverName, role: 'ambulance' }
        }
      });

      if (authError) throw authError;

      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token
      });

      if (authData.user) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        await supabase.from('profiles')
          .update({ is_approved: true })
          .eq('id', authData.user.id);

        if (newVehicleNumber) {
          await supabase.from('ambulances').insert({
            driver_id: authData.user.id,
            vehicle_number: newVehicleNumber,
            current_lat: 28.6139,
            current_lng: 77.2090,
            heading: 0,
            speed: 0,
            emergency_status: 'inactive'
          });
        }

        toast.success(`Driver ${newDriverName} created and approved`);
        setDialogOpen(false);
        setNewDriverEmail('');
        setNewDriverPassword('');
        setNewDriverName('');
        setNewVehicleNumber('');
        loadDriverData();
        loadFleetData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create driver');
    } finally {
      setCreatingDriver(false);
    }
  };

  const handleToggleApproval = async (driver: DriverWithAmbulance) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: !driver.is_approved })
        .eq('id', driver.id);

      if (error) throw error;

      toast.success(`Driver ${driver.is_approved ? 'suspended' : 'approved'}`);
      loadDriverData();
    } catch (error: any) {
      toast.error('Failed to update driver status');
    }
  };

  const handleDeleteDriver = async (driver: DriverWithAmbulance) => {
    if (!confirm(`Delete ${driver.full_name || driver.email}?`)) return;

    try {
      if (driver.ambulance) {
        await supabase.from('ambulances')
          .update({ driver_id: null })
          .eq('id', driver.ambulance.id);
      }

      await supabase.from('profiles').delete().eq('id', driver.id);
      toast.success('Driver deleted');
      loadDriverData();
      loadFleetData();
    } catch (error: any) {
      toast.error('Failed to delete driver');
    }
  };

  // Hospital Management Functions
  const toggleHospitalAcceptance = async (hospitalId: string, accepting: boolean) => {
    try {
      const { error } = await supabase
        .from('hospital_capacity')
        .update({
          is_accepting_patients: accepting,
          last_updated: new Date().toISOString()
        })
        .eq('hospital_id', hospitalId);

      if (error) throw error;

      toast.success(`Hospital ${accepting ? 'reopened' : 'closed'} for new patients`);
      loadHospitalData();
    } catch (error: any) {
      toast.error('Failed to update hospital status');
    }
  };

  const updateHospitalBeds = async (hospitalId: string, bedType: string, count: number) => {
    try {
      const { error } = await supabase
        .from('hospital_capacity')
        .update({
          [bedType]: count,
          last_updated: new Date().toISOString()
        })
        .eq('hospital_id', hospitalId);

      if (error) throw error;

      toast.success('Hospital capacity updated');
      loadHospitalData();
    } catch (error: any) {
      toast.error('Failed to update capacity');
    }
  };

  // System Control Actions
  const toggleSystemStatus = async () => {
    if (!systemControl) return;
    
    const newStatus = !systemControl.system_enabled;
    const { error } = await supabase
      .from('system_control')
      .update({ system_enabled: newStatus })
      .eq('id', systemControl.id);
    
    if (error) {
      toast.error('Failed to update system status');
      return;
    }
    
    setSystemControl({ ...systemControl, system_enabled: newStatus });
    toast.success(`System ${newStatus ? 'ENABLED' : 'DISABLED'}`);
  };

  const sendEmergencyBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Please enter a broadcast message');
      return;
    }
    
    const { error } = await supabase
      .from('system_control')
      .update({ 
        emergency_broadcast: broadcastMessage,
        broadcast_active: true 
      })
      .eq('id', systemControl?.id);
    
    if (error) {
      toast.error('Failed to send broadcast');
      return;
    }
    
    toast.success('Emergency broadcast sent to all units');
    setBroadcastMessage('');
    loadSystemControl();
  };

  const toggleSignalOverride = async (signalId: string, status: 'green' | 'red' | 'normal') => {
    const { error } = await supabase
      .from('traffic_signals')
      .update({ 
        manual_override: status !== 'normal',
        override_status: status,
        override_duration_minutes: status !== 'normal' ? 15 : 0
      })
      .eq('id', signalId);
    
    if (error) {
      toast.error('Failed to update signal');
      return;
    }
    
    toast.success(`Signal set to ${status.toUpperCase()}`);
    loadTrafficData();
  };

  const toggleAmbulanceBlock = async (ambulanceId: string, isBlocked: boolean) => {
    const { error } = await supabase
      .from('ambulances')
      .update({ 
        is_blocked: !isBlocked,
        blocked_by: !isBlocked ? user?.id : null,
        blocked_at: !isBlocked ? new Date().toISOString() : null
      })
      .eq('id', ambulanceId);
    
    if (error) {
      toast.error('Failed to update ambulance status');
      return;
    }
    
    toast.success(`Ambulance ${!isBlocked ? 'BLOCKED' : 'UNBLOCKED'}`);
    loadFleetData();
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p>Loading Command Center...</p>
        </div>
      </div>
    );
  }

  const activeEmergencies = emergencyTokens.filter(t => ['assigned', 'in_progress', 'to_hospital'].includes(t.status));
  const operationalAmbulances = ambulances.filter(a => !a.is_blocked);
  const blockedAmbulances = ambulances.filter(a => a.is_blocked);
  const pendingDrivers = drivers.filter(d => !d.is_approved);
  const approvedDrivers = drivers.filter(d => d.is_approved);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <nav className="border-b border-slate-700 bg-slate-800/80 backdrop-blur-xl px-4 py-3">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-500" />
            <div>
              <span className="font-bold text-white text-lg">ADMIN COMMAND CENTER</span>
              <Badge variant="outline" className="ml-2 text-amber-400 border-amber-500">
                {profile?.role?.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* System Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${systemControl?.system_enabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-slate-300">
                System {systemControl?.system_enabled ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            
            <span className="text-sm text-slate-400">{profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-300">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active Emergencies</p>
                  <p className="text-2xl font-bold text-red-400">{activeEmergencies.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Fleet Status</p>
                  <p className="text-2xl font-bold text-green-400">{operationalAmbulances.length}/{ambulances.length}</p>
                </div>
                <Ambulance className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Drivers</p>
                  <p className="text-2xl font-bold text-blue-400">{approvedDrivers.length}/{drivers.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg Response</p>
                  <p className="text-2xl font-bold text-amber-400">{Math.floor(analytics.avg_response_time_seconds / 60)}m</p>
                </div>
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Lives Saved</p>
                  <p className="text-2xl font-bold text-emerald-400">{analytics.lives_saved_estimate}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Control Tabs */}
        <Tabs defaultValue="control" className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="control" className="data-[state=active]:bg-amber-600">
              <Power className="w-4 h-4 mr-2" />
              System Control
            </TabsTrigger>
            <TabsTrigger value="drivers" className="data-[state=active]:bg-amber-600">
              <Users className="w-4 h-4 mr-2" />
              Driver Management
            </TabsTrigger>
            <TabsTrigger value="fleet" className="data-[state=active]:bg-amber-600">
              <Ambulance className="w-4 h-4 mr-2" />
              Fleet Command
            </TabsTrigger>
            <TabsTrigger value="traffic" className="data-[state=active]:bg-amber-600">
              <Zap className="w-4 h-4 mr-2" />
              Traffic Control
            </TabsTrigger>
            <TabsTrigger value="hospitals" className="data-[state=active]:bg-amber-600">
              <Building2 className="w-4 h-4 mr-2" />
              Hospital Load
            </TabsTrigger>
            <TabsTrigger value="emergency" className="data-[state=active]:bg-amber-600">
              <Radio className="w-4 h-4 mr-2" />
              Emergency Center
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-amber-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* System Control Tab */}
          <TabsContent value="control" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Power className="w-5 h-5 text-amber-500" />
                    City Master Control
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Global system controls and emergency broadcasting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <p className="font-medium text-white">System Status</p>
                      <p className="text-sm text-slate-400">
                        {systemControl?.system_enabled ? 'All systems operational' : 'System disabled - Emergency mode only'}
                      </p>
                    </div>
                    <Switch
                      checked={systemControl?.system_enabled || false}
                      onCheckedChange={toggleSystemStatus}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white">Emergency Broadcast</label>
                    <Textarea
                      placeholder="Enter city-wide emergency message..."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      rows={3}
                    />
                    <Button 
                      onClick={sendEmergencyBroadcast}
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={!broadcastMessage.trim()}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      SEND EMERGENCY BROADCAST
                    </Button>
                  </div>
                  
                  {systemControl?.broadcast_active && systemControl.emergency_broadcast && (
                    <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg">
                      <p className="text-sm font-medium text-red-400">Active Broadcast:</p>
                      <p className="text-sm text-white">{systemControl.emergency_broadcast}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Map className="w-5 h-5 text-blue-500" />
                    Live City Map
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square w-full rounded-lg overflow-hidden border border-slate-600">
                    <MapComponent
                      center={[28.6139, 77.2090]} // Delhi center
                      zoom={11}
                      markers={[
                        ...ambulances.map(amb => ({
                          position: [amb.current_lat, amb.current_lng] as [number, number],
                          popup: `${amb.vehicle_number} - ${amb.emergency_status}`,
                          icon: 'ambulance' as const
                        })),
                        ...signals.map(signal => ({
                          position: [signal.location_lat, signal.location_lng] as [number, number],
                          popup: `${signal.signal_name} - ${signal.current_status}`,
                          icon: 'signal' as const
                        }))
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Driver Management Tab */}
          <TabsContent value="drivers" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Driver Management</h3>
                <p className="text-slate-400">Manage ambulance drivers and approvals</p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Driver
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Create New Driver</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Create a pre-approved ambulance driver account
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateDriver} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-200">Full Name</Label>
                      <Input
                        value={newDriverName}
                        onChange={(e) => setNewDriverName(e.target.value)}
                        placeholder="John Doe"
                        required
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">Email</Label>
                      <Input
                        type="email"
                        value={newDriverEmail}
                        onChange={(e) => setNewDriverEmail(e.target.value)}
                        placeholder="driver@example.com"
                        required
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">Password</Label>
                      <Input
                        type="password"
                        value={newDriverPassword}
                        onChange={(e) => setNewDriverPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">Vehicle Number (Optional)</Label>
                      <Input
                        value={newVehicleNumber}
                        onChange={(e) => setNewVehicleNumber(e.target.value)}
                        placeholder="AMB-001"
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={creatingDriver}>
                      {creatingDriver ? 'Creating...' : 'Create Driver Account'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {pendingDrivers.length > 0 && (
                <Card className="bg-red-900/20 border-red-700">
                  <CardHeader>
                    <CardTitle className="text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Pending Approvals ({pendingDrivers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingDrivers.map((driver) => (
                        <div key={driver.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <div>
                            <p className="font-medium text-white">{driver.full_name || 'Unnamed'}</p>
                            <p className="text-sm text-slate-400">{driver.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleToggleApproval(driver)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteDriver(driver)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">All Drivers ({drivers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Driver</TableHead>
                        <TableHead className="text-slate-300">Email</TableHead>
                        <TableHead className="text-slate-300">Ambulance</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drivers.map((driver) => (
                        <TableRow key={driver.id} className="border-slate-700">
                          <TableCell className="text-white font-medium">
                            {driver.full_name || 'Unnamed'}
                          </TableCell>
                          <TableCell className="text-slate-300">{driver.email}</TableCell>
                          <TableCell>
                            {driver.ambulance ? (
                              <Badge variant="outline" className="border-blue-500 text-blue-400">
                                <Ambulance className="w-3 h-3 mr-1" />
                                {driver.ambulance.vehicle_number}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-500 text-slate-400">
                                Not assigned
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {driver.is_approved ? (
                              <Badge className="bg-green-600/20 text-green-400 border-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge className="bg-red-600/20 text-red-400 border-red-600">
                                <XCircle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={driver.is_approved ? "destructive" : "default"}
                                onClick={() => handleToggleApproval(driver)}
                                className={driver.is_approved ? "" : "bg-green-600 hover:bg-green-700"}
                              >
                                {driver.is_approved ? 'Suspend' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-600 text-red-400 hover:bg-red-600/20"
                                onClick={() => handleDeleteDriver(driver)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fleet Command Tab */}
          <TabsContent value="fleet" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Ambulance Fleet Command</CardTitle>
                <CardDescription className="text-slate-400">
                  Monitor and control all ambulances in the city
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ambulances.map((ambulance) => {
                    const driver = ambulance.profiles;
                    const isActive = activeEmergencies.some(e => e.ambulance_id === ambulance.id);
                    
                    return (
                      <div key={ambulance.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${
                              ambulance.is_blocked ? 'bg-red-500' : 
                              isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-500'
                            }`} />
                            <div>
                              <p className="font-medium text-white">{ambulance.vehicle_number}</p>
                              <p className="text-sm text-slate-400">
                                {driver?.full_name || driver?.email || 'No driver assigned'}
                              </p>
                            </div>
                            <Badge variant={ambulance.is_blocked ? 'destructive' : isActive ? 'default' : 'secondary'}>
                              {ambulance.is_blocked ? 'BLOCKED' : ambulance.emergency_status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">
                              {ambulance.speed?.toFixed(0) || 0} km/h
                            </span>
                            <Button
                              size="sm"
                              variant={ambulance.is_blocked ? "default" : "destructive"}
                              onClick={() => toggleAmbulanceBlock(ambulance.id, ambulance.is_blocked)}
                            >
                              {ambulance.is_blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              {ambulance.is_blocked ? 'Unblock' : 'Block'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Traffic Control Tab */}
          <TabsContent value="traffic" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Traffic Signal Command</CardTitle>
                <CardDescription className="text-slate-400">
                  Manual control of traffic signals and green corridors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {signals.map((signal) => (
                    <div key={signal.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{signal.signal_name}</p>
                          <p className="text-sm text-slate-400">
                            Status: {signal.manual_override ? 'MANUAL OVERRIDE' : signal.current_status}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => toggleSignalOverride(signal.id, 'green')}
                          >
                            GREEN
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => toggleSignalOverride(signal.id, 'red')}
                          >
                            RED
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300"
                            onClick={() => toggleSignalOverride(signal.id, 'normal')}
                          >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hospital Load Tab */}
          <TabsContent value="hospitals" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Hospital Capacity Management</CardTitle>
                <CardDescription className="text-slate-400">
                  Monitor and manage hospital bed availability in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hospitalCapacities.map((hospital) => {
                    const occupancyRate = (hospital.occupied_beds / Math.max(hospital.total_beds, 1)) * 100;
                    const icuOccupancyRate = (hospital.occupied_icu_beds / Math.max(hospital.icu_beds, 1)) * 100;
                    const emergencyOccupancyRate = (hospital.occupied_emergency_beds / Math.max(hospital.emergency_beds, 1)) * 100;
                    
                    return (
                      <div key={hospital.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-medium text-white text-lg">{hospital.hospital_name}</p>
                            <p className="text-sm text-slate-400">Last updated: {new Date(hospital.last_updated).toLocaleTimeString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm text-slate-400">Overall Occupancy</p>
                              <p className={`text-2xl font-bold ${
                                occupancyRate > 90 ? 'text-red-400' : 
                                occupancyRate > 75 ? 'text-amber-400' : 'text-green-400'
                              }`}>{occupancyRate.toFixed(0)}%</p>
                            </div>
                            <Switch
                              checked={hospital.is_accepting_patients}
                              onCheckedChange={(accepting) => toggleHospitalAcceptance(hospital.hospital_id, accepting)}
                              className="data-[state=checked]:bg-green-600"
                            />
                            <Badge variant={hospital.is_accepting_patients ? 'default' : 'destructive'}>
                              {hospital.is_accepting_patients ? 'ACCEPTING' : 'FULL'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* General Beds */}
                          <div className="p-3 bg-slate-600/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-slate-300">General Beds</p>
                              <Badge variant="outline" className={occupancyRate > 90 ? 'border-red-500 text-red-400' : 'border-slate-500'}>
                                {occupancyRate.toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Input
                                type="number"
                                value={hospital.occupied_beds}
                                onChange={(e) => updateHospitalBeds(hospital.hospital_id, 'occupied_beds', parseInt(e.target.value) || 0)}
                                className="w-20 h-8 bg-slate-700 border-slate-600 text-white text-sm"
                                min="0"
                                max={hospital.total_beds}
                              />
                              <span className="text-slate-400">/</span>
                              <Input
                                type="number"
                                value={hospital.total_beds}
                                onChange={(e) => updateHospitalBeds(hospital.hospital_id, 'total_beds', parseInt(e.target.value) || 0)}
                                className="w-20 h-8 bg-slate-700 border-slate-600 text-white text-sm"
                                min="0"
                              />
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  occupancyRate > 90 ? 'bg-red-500' : 
                                  occupancyRate > 75 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* ICU Beds */}
                          <div className="p-3 bg-slate-600/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-slate-300">ICU Beds</p>
                              <Badge variant="outline" className={icuOccupancyRate > 90 ? 'border-red-500 text-red-400' : 'border-slate-500'}>
                                {icuOccupancyRate.toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Input
                                type="number"
                                value={hospital.occupied_icu_beds}
                                onChange={(e) => updateHospitalBeds(hospital.hospital_id, 'occupied_icu_beds', parseInt(e.target.value) || 0)}
                                className="w-20 h-8 bg-slate-700 border-slate-600 text-white text-sm"
                                min="0"
                                max={hospital.icu_beds}
                              />
                              <span className="text-slate-400">/</span>
                              <Input
                                type="number"
                                value={hospital.icu_beds}
                                onChange={(e) => updateHospitalBeds(hospital.hospital_id, 'icu_beds', parseInt(e.target.value) || 0)}
                                className="w-20 h-8 bg-slate-700 border-slate-600 text-white text-sm"
                                min="0"
                              />
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  icuOccupancyRate > 90 ? 'bg-red-500' : 
                                  icuOccupancyRate > 75 ? 'bg-amber-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(icuOccupancyRate, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Emergency Beds */}
                          <div className="p-3 bg-slate-600/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-slate-300">Emergency Beds</p>
                              <Badge variant="outline" className={emergencyOccupancyRate > 90 ? 'border-red-500 text-red-400' : 'border-slate-500'}>
                                {emergencyOccupancyRate.toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Input
                                type="number"
                                value={hospital.occupied_emergency_beds}
                                onChange={(e) => updateHospitalBeds(hospital.hospital_id, 'occupied_emergency_beds', parseInt(e.target.value) || 0)}
                                className="w-20 h-8 bg-slate-700 border-slate-600 text-white text-sm"
                                min="0"
                                max={hospital.emergency_beds}
                              />
                              <span className="text-slate-400">/</span>
                              <Input
                                type="number"
                                value={hospital.emergency_beds}
                                onChange={(e) => updateHospitalBeds(hospital.hospital_id, 'emergency_beds', parseInt(e.target.value) || 0)}
                                className="w-20 h-8 bg-slate-700 border-slate-600 text-white text-sm"
                                min="0"
                              />
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  emergencyOccupancyRate > 90 ? 'bg-red-500' : 
                                  emergencyOccupancyRate > 75 ? 'bg-amber-500' : 'bg-purple-500'
                                }`}
                                style={{ width: `${Math.min(emergencyOccupancyRate, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span>Available: {hospital.total_beds - hospital.occupied_beds} general</span>
                            <span>•</span>
                            <span>{hospital.icu_beds - hospital.occupied_icu_beds} ICU</span>
                            <span>•</span>
                            <span>{hospital.emergency_beds - hospital.occupied_emergency_beds} emergency</span>
                          </div>
                          <Button
                            size="sm"
                            variant={hospital.is_accepting_patients ? "destructive" : "default"}
                            onClick={() => toggleHospitalAcceptance(hospital.hospital_id, !hospital.is_accepting_patients)}
                            className={hospital.is_accepting_patients ? "" : "bg-green-600 hover:bg-green-700"}
                          >
                            {hospital.is_accepting_patients ? 'Close Hospital' : 'Reopen Hospital'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {hospitalCapacities.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      No hospital data available. Please add hospitals to the system.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Center Tab */}
          <TabsContent value="emergency" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Active Emergency Operations</CardTitle>
                <CardDescription className="text-slate-400">
                  Monitor and manage all active emergencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeEmergencies.map((emergency) => {
                    const ambulance = ambulances.find(a => a.id === emergency.ambulance_id);
                    
                    return (
                      <div key={emergency.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">Token: {emergency.token_code}</p>
                            <p className="text-sm text-slate-400">
                              Ambulance: {ambulance?.vehicle_number || 'Unknown'}
                            </p>
                            <p className="text-sm text-slate-400">
                              Status: {emergency.status.replace(/_/g, ' ').toUpperCase()}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-slate-400">Duration</p>
                            <p className="text-white">
                              {Math.floor((Date.now() - new Date(emergency.created_at).getTime()) / 60000)}m
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {activeEmergencies.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      No active emergencies
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Response Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-400">Average Response Time</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {Math.floor(analytics.avg_response_time_seconds / 60)}m {analytics.avg_response_time_seconds % 60}s
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Corridor Efficiency</p>
                      <p className="text-2xl font-bold text-green-400">
                        {analytics.corridor_efficiency_percent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Today's Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-400">Total Emergencies</p>
                      <p className="text-2xl font-bold text-amber-400">{analytics.total_emergencies}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Lives Saved (Est.)</p>
                      <p className="text-2xl font-bold text-red-400">{analytics.lives_saved_estimate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-400">Hospital Load</p>
                      <p className="text-2xl font-bold text-orange-400">
                        {analytics.hospital_overload_rate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Fleet Availability</p>
                      <p className="text-2xl font-bold text-green-400">
                        {Math.floor((operationalAmbulances.length / Math.max(ambulances.length, 1)) * 100)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}