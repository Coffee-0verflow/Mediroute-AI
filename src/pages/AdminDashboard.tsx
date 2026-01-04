import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertTriangle, LogOut, UserPlus, Ambulance, Shield, CheckCircle, XCircle, Link2, RefreshCw, Eye, MapPin, Clock, Mail, User, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Profile, Ambulance as AmbulanceType } from '@/types/database';

interface DriverWithAmbulance extends Profile {
  ambulance?: AmbulanceType | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const { toast } = useToast();
  
  const [drivers, setDrivers] = useState<DriverWithAmbulance[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceType[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // New driver form
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [creatingDriver, setCreatingDriver] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Link ambulance dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverWithAmbulance | null>(null);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>('');
  
  // Assign driver to ambulance dialog
  const [assignDriverDialogOpen, setAssignDriverDialogOpen] = useState(false);
  const [selectedAmbulanceForAssign, setSelectedAmbulanceForAssign] = useState<AmbulanceType | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Detail sheets
  const [selectedDriverForDetail, setSelectedDriverForDetail] = useState<DriverWithAmbulance | null>(null);
  const [selectedAmbulanceForDetail, setSelectedAmbulanceForDetail] = useState<AmbulanceType | null>(null);
  const [driverDetailOpen, setDriverDetailOpen] = useState(false);
  const [ambulanceDetailOpen, setAmbulanceDetailOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) {
      toast({
        title: 'Access Denied',
        description: 'You must be an admin to access this page.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [user, profile, loading, navigate, toast]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      // Fetch all ambulance drivers
      const { data: driversData, error: driversError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'ambulance')
        .order('created_at', { ascending: false });

      if (driversError) throw driversError;

      // Fetch all ambulances
      const { data: ambulancesData, error: ambulancesError } = await supabase
        .from('ambulances')
        .select('*')
        .order('created_at', { ascending: false });

      if (ambulancesError) throw ambulancesError;

      // Map drivers with their ambulances
      const driversWithAmbulances: DriverWithAmbulance[] = (driversData || []).map(driver => {
        const ambulance = ambulancesData?.find(a => a.driver_id === driver.id);
        return {
          ...driver,
          ambulance: ambulance ? { ...ambulance, vehicle_health: (ambulance as any).vehicle_health || 'good' } : null
        };
      });

      setDrivers(driversWithAmbulances);
      setAmbulances((ambulancesData || []).map(ambulance => ({ 
        ...ambulance, 
        vehicle_health: (ambulance as any).vehicle_health || 'good' 
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingDriver(true);

    try {
      // Store the current session before creating a new user
      const { data: currentSession } = await supabase.auth.getSession();
      const adminSession = currentSession.session;

      if (!adminSession) {
        throw new Error('Admin session not found');
      }

      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newDriverEmail,
        password: newDriverPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: newDriverName,
            role: 'ambulance',
          },
        },
      });

      if (authError) throw authError;

      // IMMEDIATELY restore admin session to prevent redirect
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });

      if (authData.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update the profile to be approved (as admin)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_approved: true })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('Error approving driver:', updateError);
        }

        // Create ambulance if vehicle number provided
        if (newVehicleNumber) {
          const { error: ambulanceError } = await supabase
            .from('ambulances')
            .insert({
              driver_id: authData.user.id,
              vehicle_number: newVehicleNumber,
              current_lat: 0,
              current_lng: 0,
              heading: 0,
              speed: 0,
              emergency_status: 'inactive',
            });

          if (ambulanceError) {
            console.error('Error creating ambulance:', ambulanceError);
          }
        }

        toast({
          title: 'Driver Created',
          description: `Account for ${newDriverName} has been created and approved.`,
        });

        setDialogOpen(false);
        setNewDriverEmail('');
        setNewDriverPassword('');
        setNewDriverName('');
        setNewVehicleNumber('');
        fetchData();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create driver',
        variant: 'destructive',
      });
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

      toast({
        title: driver.is_approved ? 'Driver Suspended' : 'Driver Approved',
        description: `${driver.full_name || driver.email} has been ${driver.is_approved ? 'suspended' : 'approved'}.`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update driver',
        variant: 'destructive',
      });
    }
  };

  const handleLinkAmbulance = async () => {
    if (!selectedDriver || !selectedAmbulanceId) return;

    try {
      // Update ambulance to link to driver
      const { error: ambulanceError } = await supabase
        .from('ambulances')
        .update({ driver_id: selectedDriver.id })
        .eq('id', selectedAmbulanceId);

      if (ambulanceError) throw ambulanceError;

      // Update profile with ambulance_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ ambulance_id: selectedAmbulanceId })
        .eq('id', selectedDriver.id);

      if (profileError) throw profileError;

      toast({
        title: 'Ambulance Linked',
        description: `Ambulance has been linked to ${selectedDriver.full_name || selectedDriver.email}.`,
      });

      setLinkDialogOpen(false);
      setSelectedDriver(null);
      setSelectedAmbulanceId('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link ambulance',
        variant: 'destructive',
      });
    }
  };

  const handleAssignDriverToAmbulance = async () => {
    if (!selectedAmbulanceForAssign || !selectedDriverId) return;

    try {
      // Update ambulance to link to driver
      const { error: ambulanceError } = await supabase
        .from('ambulances')
        .update({ driver_id: selectedDriverId })
        .eq('id', selectedAmbulanceForAssign.id);

      if (ambulanceError) throw ambulanceError;

      // Update profile with ambulance_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ ambulance_id: selectedAmbulanceForAssign.id })
        .eq('id', selectedDriverId);

      if (profileError) throw profileError;

      const driver = drivers.find(d => d.id === selectedDriverId);
      toast({
        title: 'Driver Assigned',
        description: `${driver?.full_name || driver?.email} assigned to ${selectedAmbulanceForAssign.vehicle_number}.`,
      });

      setAssignDriverDialogOpen(false);
      setSelectedAmbulanceForAssign(null);
      setSelectedDriverId('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign driver',
        variant: 'destructive',
      });
    }
  };

  const handleCreateAmbulance = async (vehicleNumber: string, assignToDriverId?: string) => {
    try {
      const insertData: any = {
        vehicle_number: vehicleNumber,
        current_lat: 0,
        current_lng: 0,
        heading: 0,
        speed: 0,
        emergency_status: 'inactive',
      };

      // Only set driver_id if assigning to a driver
      if (assignToDriverId) {
        insertData.driver_id = assignToDriverId;
      }

      const { data: newAmbulance, error } = await supabase
        .from('ambulances')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // If assigned to a driver, also update the profile
      if (assignToDriverId && newAmbulance) {
        await supabase
          .from('profiles')
          .update({ ambulance_id: newAmbulance.id })
          .eq('id', assignToDriverId);
      }

      toast({
        title: 'Ambulance Created',
        description: `Ambulance ${vehicleNumber} has been added${assignToDriverId ? ' and assigned' : ''}.`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ambulance',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDriver = async (driver: DriverWithAmbulance) => {
    if (!confirm(`Are you sure you want to delete ${driver.full_name || driver.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      // If driver has an ambulance, unassign it first
      if (driver.ambulance) {
        await supabase
          .from('ambulances')
          .update({ driver_id: null })
          .eq('id', driver.ambulance.id);
      }

      // Delete the profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', driver.id);

      if (error) throw error;

      toast({
        title: 'Driver Deleted',
        description: `${driver.full_name || driver.email} has been removed.`,
      });

      setDriverDetailOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete driver',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAmbulance = async (ambulance: AmbulanceType) => {
    if (!confirm(`Are you sure you want to delete ambulance ${ambulance.vehicle_number}? This action cannot be undone.`)) {
      return;
    }

    try {
      // If ambulance has a driver, update their profile
      if (ambulance.driver_id) {
        await supabase
          .from('profiles')
          .update({ ambulance_id: null })
          .eq('id', ambulance.driver_id);
      }

      // Delete the ambulance
      const { error } = await supabase
        .from('ambulances')
        .delete()
        .eq('id', ambulance.id);

      if (error) throw error;

      toast({
        title: 'Ambulance Deleted',
        description: `Ambulance ${ambulance.vehicle_number} has been removed.`,
      });

      setAmbulanceDetailOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ambulance',
        variant: 'destructive',
      });
    }
  };

  if (loading || (user && profile?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Get ambulances that are not assigned to any driver (driver_id is null or undefined)
  const unassignedAmbulances = ambulances.filter(a => !a.driver_id);
  const driversWithoutAmbulance = drivers.filter(d => !d.ambulance);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <nav className="border-b border-slate-700 bg-slate-800/80 backdrop-blur-xl px-4 py-3">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-white">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-300 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Ambulance Driver Management</h1>
            <p className="text-slate-400">Approve accounts, link ambulances, and manage drivers</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loadingData} className="border-slate-600 text-slate-300">
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Driver
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Ambulance Driver</DialogTitle>
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
        </div>

        <Tabs defaultValue="drivers" className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="drivers" className="data-[state=active]:bg-amber-600">
              Drivers ({drivers.length})
            </TabsTrigger>
            <TabsTrigger value="ambulances" className="data-[state=active]:bg-amber-600">
              Ambulances ({ambulances.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Ambulance Drivers</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage driver accounts and approval status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-8 text-slate-400">Loading drivers...</div>
                ) : drivers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    No ambulance drivers found. Create one to get started.
                  </div>
                ) : (
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
                        <TableRow 
                          key={driver.id} 
                          className="border-slate-700 cursor-pointer hover:bg-slate-700/50"
                          onClick={() => {
                            setSelectedDriverForDetail(driver);
                            setDriverDetailOpen(true);
                          }}
                        >
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
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300"
                                onClick={() => {
                                  setSelectedDriverForDetail(driver);
                                  setDriverDetailOpen(true);
                                }}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant={driver.is_approved ? "destructive" : "default"}
                                onClick={() => handleToggleApproval(driver)}
                                className={driver.is_approved ? "" : "bg-green-600 hover:bg-green-700"}
                              >
                                {driver.is_approved ? 'Suspend' : 'Approve'}
                              </Button>
                              {!driver.ambulance && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-amber-600 text-amber-400 hover:bg-amber-600/20"
                                  onClick={() => {
                                    setSelectedDriver(driver);
                                    setLinkDialogOpen(true);
                                  }}
                                  disabled={unassignedAmbulances.length === 0}
                                >
                                  <Link2 className="w-3 h-3 mr-1" />
                                  Link
                                </Button>
                              )}
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ambulances">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">Ambulances</CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage ambulance vehicles
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                      <Ambulance className="w-4 h-4 mr-2" />
                      Add Ambulance
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 text-white">
                    <DialogHeader>
                      <DialogTitle>Add New Ambulance</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Create a new ambulance vehicle
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const vehicleNumber = (form.elements.namedItem('vehicleNumber') as HTMLInputElement).value;
                      handleCreateAmbulance(vehicleNumber);
                      form.reset();
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-200">Vehicle Number</Label>
                        <Input
                          name="vehicleNumber"
                          placeholder="AMB-001"
                          required
                          className="bg-slate-700/50 border-slate-600 text-white"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700">
                        Add Ambulance
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-8 text-slate-400">Loading ambulances...</div>
                ) : ambulances.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    No ambulances found. Add one to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Vehicle Number</TableHead>
                        <TableHead className="text-slate-300">Assigned Driver</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ambulances.map((ambulance) => {
                        const driver = drivers.find(d => d.id === ambulance.driver_id);
                        const isUnassigned = !ambulance.driver_id;
                        return (
                          <TableRow 
                            key={ambulance.id} 
                            className="border-slate-700 cursor-pointer hover:bg-slate-700/50"
                            onClick={() => {
                              setSelectedAmbulanceForDetail(ambulance);
                              setAmbulanceDetailOpen(true);
                            }}
                          >
                            <TableCell className="text-white font-medium">
                              {ambulance.vehicle_number}
                            </TableCell>
                            <TableCell>
                              {driver ? (
                                <span className="text-slate-300">{driver.full_name || driver.email}</span>
                              ) : (
                                <Badge variant="outline" className="border-amber-500 text-amber-400">
                                  Unassigned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  ambulance.emergency_status === 'active' 
                                    ? 'bg-red-600/20 text-red-400 border-red-600'
                                    : ambulance.emergency_status === 'responding'
                                    ? 'bg-amber-600/20 text-amber-400 border-amber-600'
                                    : 'bg-slate-600/20 text-slate-400 border-slate-600'
                                }
                              >
                                {ambulance.emergency_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-600 text-slate-300"
                                  onClick={() => {
                                    setSelectedAmbulanceForDetail(ambulance);
                                    setAmbulanceDetailOpen(true);
                                  }}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                                {isUnassigned && (
                                  <Button
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700"
                                    onClick={() => {
                                      setSelectedAmbulanceForAssign(ambulance);
                                      setAssignDriverDialogOpen(true);
                                    }}
                                    disabled={driversWithoutAmbulance.length === 0}
                                  >
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    Assign Driver
                                  </Button>
                                )}
                                {!isUnassigned && (
                                  <span className="text-xs text-green-400 flex items-center">✓ Assigned</span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-600 text-red-400 hover:bg-red-600/20"
                                  onClick={() => handleDeleteAmbulance(ambulance)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Link Ambulance Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Link Ambulance to Driver</DialogTitle>
              <DialogDescription className="text-slate-400">
                Assign an ambulance to {selectedDriver?.full_name || selectedDriver?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Select Ambulance</Label>
                <Select value={selectedAmbulanceId} onValueChange={setSelectedAmbulanceId}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Choose an ambulance" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {unassignedAmbulances.map((ambulance) => (
                      <SelectItem 
                        key={ambulance.id} 
                        value={ambulance.id}
                        className="text-white hover:bg-slate-700"
                      >
                        {ambulance.vehicle_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleLinkAmbulance} 
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={!selectedAmbulanceId}
              >
                Link Ambulance
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Driver to Ambulance Dialog */}
        <Dialog open={assignDriverDialogOpen} onOpenChange={setAssignDriverDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Assign Driver to Ambulance</DialogTitle>
              <DialogDescription className="text-slate-400">
                Assign a driver to {selectedAmbulanceForAssign?.vehicle_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Select Driver</Label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Choose a driver" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {driversWithoutAmbulance.map((driver) => (
                      <SelectItem 
                        key={driver.id} 
                        value={driver.id}
                        className="text-white hover:bg-slate-700"
                      >
                        {driver.full_name || driver.email}
                        {driver.is_approved ? ' ✓' : ' (pending)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAssignDriverToAmbulance} 
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={!selectedDriverId}
              >
                Assign Driver
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Driver Detail Sheet */}
        <Sheet open={driverDetailOpen} onOpenChange={setDriverDetailOpen}>
          <SheetContent className="bg-slate-800 border-slate-700 text-white w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-amber-500" />
                Driver Details
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                Complete information for {selectedDriverForDetail?.full_name || 'this driver'}
              </SheetDescription>
            </SheetHeader>
            {selectedDriverForDetail && (
              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-12 h-12 bg-amber-600/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-lg">{selectedDriverForDetail.full_name || 'Unnamed'}</p>
                      <p className="text-sm text-slate-400">Ambulance Driver</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="text-slate-200">{selectedDriverForDetail.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <Shield className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          {selectedDriverForDetail.is_approved ? (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge className="bg-red-600/20 text-red-400 border-red-600">
                              <XCircle className="w-3 h-3 mr-1" />
                              Pending Approval
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <Ambulance className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Assigned Ambulance</p>
                        {selectedDriverForDetail.ambulance ? (
                          <Badge variant="outline" className="border-blue-500 text-blue-400 mt-1">
                            {selectedDriverForDetail.ambulance.vehicle_number}
                          </Badge>
                        ) : (
                          <p className="text-slate-400 text-sm">Not assigned</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Member Since</p>
                        <p className="text-slate-200">{new Date(selectedDriverForDetail.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-700">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedDriverForDetail.is_approved ? "destructive" : "default"}
                      onClick={() => {
                        handleToggleApproval(selectedDriverForDetail);
                        setDriverDetailOpen(false);
                      }}
                      className={`flex-1 ${selectedDriverForDetail.is_approved ? "" : "bg-green-600 hover:bg-green-700"}`}
                    >
                      {selectedDriverForDetail.is_approved ? 'Suspend Driver' : 'Approve Driver'}
                    </Button>
                    {!selectedDriverForDetail.ambulance && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-amber-600 text-amber-400 hover:bg-amber-600/20"
                        onClick={() => {
                          setSelectedDriver(selectedDriverForDetail);
                          setDriverDetailOpen(false);
                          setLinkDialogOpen(true);
                        }}
                        disabled={unassignedAmbulances.length === 0}
                      >
                        <Link2 className="w-3 h-3 mr-1" />
                        Link Ambulance
                      </Button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-red-600 text-red-400 hover:bg-red-600/20"
                    onClick={() => handleDeleteDriver(selectedDriverForDetail)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete Driver
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Ambulance Detail Sheet */}
        <Sheet open={ambulanceDetailOpen} onOpenChange={setAmbulanceDetailOpen}>
          <SheetContent className="bg-slate-800 border-slate-700 text-white w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle className="text-white flex items-center gap-2">
                <Ambulance className="w-5 h-5 text-amber-500" />
                Ambulance Details
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                Complete information for {selectedAmbulanceForDetail?.vehicle_number}
              </SheetDescription>
            </SheetHeader>
            {selectedAmbulanceForDetail && (() => {
              const assignedDriver = drivers.find(d => d.id === selectedAmbulanceForDetail.driver_id);
              return (
                <div className="mt-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center">
                        <Ambulance className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-lg">{selectedAmbulanceForDetail.vehicle_number}</p>
                        <Badge 
                          className={
                            selectedAmbulanceForDetail.emergency_status === 'active' 
                              ? 'bg-red-600/20 text-red-400 border-red-600'
                              : selectedAmbulanceForDetail.emergency_status === 'responding'
                              ? 'bg-amber-600/20 text-amber-400 border-amber-600'
                              : 'bg-slate-600/20 text-slate-400 border-slate-600'
                          }
                        >
                          {selectedAmbulanceForDetail.emergency_status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                        <User className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Assigned Driver</p>
                          {assignedDriver ? (
                            <div className="mt-1">
                              <p className="text-slate-200">{assignedDriver.full_name || 'Unnamed'}</p>
                              <p className="text-xs text-slate-400">{assignedDriver.email}</p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="border-amber-500 text-amber-400 mt-1">
                              Unassigned
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                        <MapPin className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Current Location</p>
                          <p className="text-slate-200">
                            {selectedAmbulanceForDetail.current_lat && selectedAmbulanceForDetail.current_lng 
                              ? `${selectedAmbulanceForDetail.current_lat.toFixed(4)}, ${selectedAmbulanceForDetail.current_lng.toFixed(4)}`
                              : 'Not available'}
                          </p>
                        </div>
                      </div>
                      
                      {selectedAmbulanceForDetail.destination_name && (
                        <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                          <MapPin className="w-5 h-5 text-amber-400" />
                          <div>
                            <p className="text-xs text-slate-500">Destination</p>
                            <p className="text-slate-200">{selectedAmbulanceForDetail.destination_name}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                        <Clock className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Last Updated</p>
                          <p className="text-slate-200">{new Date(selectedAmbulanceForDetail.last_updated).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-700/30 rounded-lg">
                          <p className="text-xs text-slate-500">Speed</p>
                          <p className="text-slate-200 text-lg font-medium">{selectedAmbulanceForDetail.speed?.toFixed(1) || 0} km/h</p>
                        </div>
                        <div className="p-3 bg-slate-700/30 rounded-lg">
                          <p className="text-xs text-slate-500">Heading</p>
                          <p className="text-slate-200 text-lg font-medium">{selectedAmbulanceForDetail.heading?.toFixed(0) || 0}°</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-4 border-t border-slate-700">
                    {!assignedDriver && (
                      <Button
                        size="sm"
                        className="w-full bg-amber-600 hover:bg-amber-700"
                        onClick={() => {
                          setSelectedAmbulanceForAssign(selectedAmbulanceForDetail);
                          setAmbulanceDetailOpen(false);
                          setAssignDriverDialogOpen(true);
                        }}
                        disabled={driversWithoutAmbulance.length === 0}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Assign Driver
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-red-600 text-red-400 hover:bg-red-600/20"
                      onClick={() => handleDeleteAmbulance(selectedAmbulanceForDetail)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete Ambulance
                    </Button>
                  </div>
                </div>
              );
            })()}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}