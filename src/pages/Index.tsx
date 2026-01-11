import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Ambulance,
  Building2,
  MapPin,
  Radio,
  Zap,
  LogOut,
  Shield,
} from 'lucide-react';
import Logo from '@/components/Logo';

/* ---------------- FEATURE CONTENT ---------------- */

const FEATURES = {
  gps: {
    title: 'Live GPS Tracking',
    description:
      'Real-time location tracking of ambulances with accurate positioning.',
    details:
      'Ambulances are tracked in real time using GPS modules.\n\nThe system continuously updates the location on the dashboard, allowing hospitals and traffic systems to monitor movement and predict arrival times accurately.',
  },
  signal: {
    title: 'Signal Priority',
    description:
      'Automatic traffic signal control to clear the path for emergencies.',
    details:
      'Traffic signals automatically prioritize approaching ambulances.\n\nSignals switch to green to ensure uninterrupted movement, reducing response time and improving patient survival.',
  },
  updates: {
    title: 'Instant Updates',
    description:
      'Real-time synchronization between ambulances, hospitals, and traffic signals.',
    details:
      'All stakeholders receive instant updates.\n\nHospitals, ambulance drivers, and traffic systems remain synchronized with real-time data to ensure coordinated emergency response.',
  },
} as const;

type FeatureKey = keyof typeof FEATURES;

export default function Index() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();

  const [open, setOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<FeatureKey | null>(null);

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'ambulance') navigate('/ambulance');
      else if (profile.role === 'hospital') navigate('/hospital');
      else if (profile.role === 'admin') navigate('/admin');
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

  /* ---------------- LANDING PAGE ---------------- */

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <Logo size="lg" />
            <Link to="/auth">
              <Button className="font-semibold">Sign In</Button>
            </Link>
          </nav>

          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Smart Ambulance Navigation
              <span className="block text-primary">
                & Traffic Signal Priority
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Real-time ambulance tracking with intelligent traffic signal
              control. Save lives by ensuring clear routes for emergency
              vehicles.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 py-6 font-semibold">
                  Get Started
                </Button>
              </Link>
              <Link to="/learn-more">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>

          {/* ---------------- FEATURES ---------------- */}

          <div className="grid md:grid-cols-3 gap-6 mt-24">
            <Card
              className="bg-card border border-border cursor-pointer hover:shadow-lg transition"
              onClick={() => {
                setActiveFeature('gps');
                setOpen(true);
              }}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Live GPS Tracking</CardTitle>
                <CardDescription>
                  Real-time location tracking of ambulances with accurate
                  positioning.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="bg-card border border-border cursor-pointer hover:shadow-lg transition"
              onClick={() => {
                setActiveFeature('signal');
                setOpen(true);
              }}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-emergency/20 flex items-center justify-center mb-4">
                  <Radio className="w-6 h-6 text-emergency" />
                </div>
                <CardTitle>Signal Priority</CardTitle>
                <CardDescription>
                  Automatic traffic signal control to clear the path for
                  emergencies.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="bg-card border border-border cursor-pointer hover:shadow-lg transition"
              onClick={() => {
                setActiveFeature('updates');
                setOpen(true);
              }}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-success" />
                </div>
                <CardTitle>Instant Updates</CardTitle>
                <CardDescription>
                  Real-time synchronization between ambulances, hospitals, and
                  traffic signals.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* ---------------- FEATURE MODAL ---------------- */}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            {activeFeature && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {FEATURES[activeFeature].title}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground">
                  {FEATURES[activeFeature].description}
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {FEATURES[activeFeature].details}
                </p>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ---------------- DASHBOARD ---------------- */

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex justify-between items-center">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Select Dashboard</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
          <Card onClick={() => navigate('/ambulance')} className="cursor-pointer">
            <CardHeader>
              <Ambulance className="w-6 h-6 text-emergency mb-2" />
              <CardTitle>Ambulance Dashboard</CardTitle>
              <CardDescription>
                Manage emergency status and track route
              </CardDescription>
            </CardHeader>
          </Card>

          <Card onClick={() => navigate('/hospital')} className="cursor-pointer">
            <CardHeader>
              <Building2 className="w-6 h-6 text-primary mb-2" />
              <CardTitle>Hospital Dashboard</CardTitle>
              <CardDescription>
                Monitor incoming ambulances and ETAs
              </CardDescription>
            </CardHeader>
          </Card>

          {profile?.role === 'admin' && (
            <Card
              onClick={() => navigate('/admin')}
              className="cursor-pointer"
            >
              <CardHeader>
                <Shield className="w-6 h-6 text-amber-500 mb-2" />
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>
                  Manage drivers and ambulances
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
