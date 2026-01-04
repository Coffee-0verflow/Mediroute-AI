import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ambulance, Building2, MapPin, Radio, Zap, LogOut, Shield } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Index() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && user && profile) {
      // Redirect based on role
      if (profile.role === 'ambulance') {
        navigate('/ambulance');
      } else if (profile.role === 'hospital') {
        navigate('/hospital');
      } else if (profile.role === 'admin') {
        navigate('/admin');
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center text-primary-foreground">
          <div className="w-12 h-12 border-4 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <Logo size="lg" />
            <Link to="/auth">
              <Button variant="default" className="font-semibold">
                Sign In
              </Button>
            </Link>
          </nav>

          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in">
              Smart Ambulance Navigation
              <span className="block text-primary">& Traffic Signal Priority</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Real-time ambulance tracking with intelligent traffic signal control. 
              Save lives by ensuring clear routes for emergency vehicles.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 py-6 font-semibold">
                  Get Started
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Learn More
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-24">
            <Card className="bg-card border border-border">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">Live GPS Tracking</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Real-time location tracking of ambulances with accurate positioning.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-card border border-border">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-emergency/20 flex items-center justify-center mb-4">
                  <Radio className="w-6 h-6 text-emergency" />
                </div>
                <CardTitle className="text-foreground">Signal Priority</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Automatic traffic signal control to clear the path for emergencies.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-card border border-border">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-success" />
                </div>
                <CardTitle className="text-foreground">Instant Updates</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Real-time synchronization between ambulances, hospitals, and traffic signals.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for authenticated users without specific role redirect
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex justify-between items-center">
          <Logo size="sm" />
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Select Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/ambulance')}>
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-emergency/10 flex items-center justify-center mb-2">
                <Ambulance className="w-6 h-6 text-emergency" />
              </div>
              <CardTitle>Ambulance Dashboard</CardTitle>
              <CardDescription>Manage emergency status and track route</CardDescription>
            </CardHeader>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/hospital')}>
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Hospital Dashboard</CardTitle>
              <CardDescription>Monitor incoming ambulances and ETAs</CardDescription>
            </CardHeader>
          </Card>
          {profile?.role === 'admin' && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin')}>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6 text-amber-500" />
                </div>
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>Manage drivers and ambulances</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
