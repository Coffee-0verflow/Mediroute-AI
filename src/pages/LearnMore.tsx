import { useNavigate } from "react-router-dom";
import {
  Ambulance,
  MapPin,
  Activity,
  Hospital,
  ArrowLeft,
  CheckCircle,
  Users,
  Building2,
  Globe,
  Siren,
  HeartPulse,
  TrafficCone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LearnMore() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-cyan-400">MediRoute AI</h1>
        <Button
          className="bg-cyan-500 hover:bg-cyan-600 text-black"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>
      </header>

      {/* Hero */}
      <section className="px-6 py-16 text-center max-w-4xl mx-auto">
        <h2 className="text-4xl font-extrabold mb-4">
          Smart Ambulance Navigation & Traffic Signal Priority
        </h2>
        <p className="text-muted-foreground text-lg">
          MediRoute AI is a real‑time emergency response platform that connects
          ambulances, hospitals, and traffic infrastructure to reduce response
          time and save lives when every second matters.
        </p>
      </section>

      {/* How It Works */}
      <section className="px-6 py-12 max-w-6xl mx-auto">
        <h3 className="text-2xl font-bold mb-8 text-center">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-card/60 border-border">
            <CardContent className="p-6 text-center space-y-3">
              <Ambulance className="w-10 h-10 mx-auto text-cyan-400" />
              <h4 className="font-semibold">Emergency Trigger</h4>
              <p className="text-sm text-muted-foreground">
                Ambulance activates emergency mode and starts live GPS streaming.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border">
            <CardContent className="p-6 text-center space-y-3">
              <MapPin className="w-10 h-10 mx-auto text-green-400" />
              <h4 className="font-semibold">AI Route Optimization</h4>
              <p className="text-sm text-muted-foreground">
                Fastest routes are calculated and traffic signals are
                dynamically prioritized.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border">
            <CardContent className="p-6 text-center space-y-3">
              <Hospital className="w-10 h-10 mx-auto text-purple-400" />
              <h4 className="font-semibold">Hospital Allocation</h4>
              <p className="text-sm text-muted-foreground">
                Patient routed to the nearest hospital with available capacity.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Key Features */}
      <section className="px-6 py-12 bg-muted/30">
        <h3 className="text-2xl font-bold mb-6 text-center">Key Features</h3>
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4">
          {[
            "Real-time ambulance GPS tracking",
            "Traffic signal priority automation",
            "Hospital bed & ICU availability monitoring",
            "Live dashboards for ambulance, hospital & admin",
            "AI-based dynamic route recalculation",
            "Scalable multi-city emergency network",
          ].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 bg-card/70 p-4 rounded-xl border border-border"
            >
              <CheckCircle className="w-5 h-5 text-cyan-400" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Real World Impact */}
      <section className="px-6 py-12 max-w-5xl mx-auto">
        <h3 className="text-2xl font-bold mb-8 text-center">
          Real‑World Impact
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card/60">
            <CardContent className="p-6 flex items-center gap-4">
              <Siren className="w-8 h-8 text-cyan-400" />
              <span>Reduces ambulance response time</span>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardContent className="p-6 flex items-center gap-4">
              <Building2 className="w-8 h-8 text-purple-400" />
              <span>Prevents hospital overcrowding</span>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardContent className="p-6 flex items-center gap-4">
              <TrafficCone className="w-8 h-8 text-green-400" />
              <span>Improves traffic flow during emergencies</span>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardContent className="p-6 flex items-center gap-4">
              <HeartPulse className="w-8 h-8 text-red-400" />
              <span>Saves lives in critical minutes</span>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-6 py-12 bg-muted/30">
        <h3 className="text-2xl font-bold mb-8 text-center">Use Cases</h3>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="bg-card/60">
            <CardContent className="p-6 text-center">
              <Globe className="w-8 h-8 mx-auto text-cyan-400 mb-2" />
              <h4 className="font-semibold">Cities</h4>
              <p className="text-sm text-muted-foreground">
                City-wide emergency response optimization.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardContent className="p-6 text-center">
              <Activity className="w-8 h-8 mx-auto text-red-400 mb-2" />
              <h4 className="font-semibold">Emergency Services</h4>
              <p className="text-sm text-muted-foreground">
                Faster dispatch, routing, and coordination.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardContent className="p-6 text-center">
              <Hospital className="w-8 h-8 mx-auto text-purple-400 mb-2" />
              <h4 className="font-semibold">Hospital Networks</h4>
              <p className="text-sm text-muted-foreground">
                Load balancing and real-time capacity visibility.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Who Is It For */}
      <section className="px-6 py-12 max-w-6xl mx-auto">
        <h3 className="text-2xl font-bold mb-8 text-center">Who Is It For?</h3>

        <div className="grid md:grid-cols-4 gap-6">
          <Card className="bg-card/60">
            <CardContent className="p-6 text-center">
              <Ambulance className="w-8 h-8 mx-auto text-cyan-400 mb-2" />
              <span>Ambulance Services</span>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardContent className="p-6 text-center">
              <Hospital className="w-8 h-8 mx-auto text-purple-400 mb-2" />
              <span>Hospitals</span>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardContent className="p-6 text-center">
              <Building2 className="w-8 h-8 mx-auto text-green-400 mb-2" />
              <span>City Authorities</span>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto text-yellow-400 mb-2" />
              <span>Smart City Initiatives</span>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 text-center text-sm text-muted-foreground">
        Built for smarter cities, faster response, and saving lives 🚑
      </footer>
    </div>
  );
}
