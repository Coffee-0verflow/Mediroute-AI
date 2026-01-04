import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrafficSignal, Ambulance, calculateDistance } from '@/types/database';
import { Radio } from 'lucide-react';

interface TrafficSignalStatusPanelProps {
  signals: TrafficSignal[];
  ambulance: Ambulance | null;
  isActive: boolean;
}

const getDirectionLabel = (direction: string | null): string => {
  switch (direction) {
    case 'N_S': return 'North → South';
    case 'S_N': return 'South → North';
    case 'E_W': return 'East → West';
    case 'W_E': return 'West → East';
    default: return '—';
  }
};

const getSignalStateDisplay = (signal: TrafficSignal) => {
  if (signal.current_status === 'priority') {
    return {
      emoji: '🟢',
      text: 'GREEN (EMERGENCY MODE)',
      className: 'text-success font-bold',
      isEmergency: true,
    };
  }
  if (signal.current_status === 'prepare') {
    return {
      emoji: '🟡',
      text: 'BLINKING GREEN (PREPARE)',
      className: 'text-warning font-bold animate-signal-blink',
      isEmergency: true,
    };
  }

  // Normal state - show actual signal colors
  const nsGreen = signal.direction_ns === 'GREEN' || signal.direction_sn === 'GREEN';
  const ewGreen = signal.direction_ew === 'GREEN' || signal.direction_we === 'GREEN';

  if (nsGreen) {
    return {
      emoji: '🔴',
      text: 'RED (N-S: GREEN)',
      className: 'text-signal-red',
      isEmergency: false,
    };
  }
  if (ewGreen) {
    return {
      emoji: '🔴',
      text: 'RED (E-W: GREEN)',
      className: 'text-signal-red',
      isEmergency: false,
    };
  }
  return {
    emoji: '🟡',
    text: 'YELLOW (CHANGING)',
    className: 'text-signal-yellow',
    isEmergency: false,
  };
};

export default function TrafficSignalStatusPanel({ signals, ambulance, isActive }: TrafficSignalStatusPanelProps) {
  // Calculate distances and sort by proximity
  const nearbySignals = useMemo(() => {
    if (!ambulance) return [];

    return signals
      .map((signal) => ({
        ...signal,
        distance: calculateDistance(
          ambulance.current_lat,
          ambulance.current_lng,
          signal.location_lat,
          signal.location_lng,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6); // Show max 6 nearest signals
  }, [signals, ambulance]);

  const statusLabel = isActive ? 'LIVE' : 'MONITORING';

  return (
    <Card className="border-primary/30 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="w-5 h-5 text-primary animate-pulse" />
          TRAFFIC SIGNAL STATUS
          <Badge
            variant="outline"
            className={
              isActive
                ? 'ml-2 text-xs animate-pulse bg-success/10 text-success border-success/30'
                : 'ml-2 text-xs bg-muted/40 text-muted-foreground border-border'
            }
          >
            {statusLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nearbySignals.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              No traffic signals found yet. If GPS is enabled, this panel will populate with the nearest signals.
            </p>
          </div>
        ) : (
          nearbySignals.map((signal) => {
            const stateDisplay = getSignalStateDisplay(signal);

            return (
              <div
                key={signal.id}
                className={`p-4 rounded-lg border transition-all ${
                  stateDisplay.isEmergency
                    ? 'bg-success/10 border-success/30 shadow-success'
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Signal ID:</span>
                    <span className="font-mono text-sm">{signal.signal_name}</span>
                  </div>
                  {stateDisplay.isEmergency && (
                    <Badge variant="destructive" className="animate-pulse">
                      PRIORITY
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Distance from Ambulance:</span>
                    <p className="font-bold text-lg text-foreground">
                      {signal.distance < 1000
                        ? `${Math.round(signal.distance)} m`
                        : `${(signal.distance / 1000).toFixed(1)} km`}
                    </p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Active Direction:</span>
                    <p className="font-medium text-foreground">{getDirectionLabel(signal.priority_direction)}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/50">
                  <span className="text-muted-foreground text-sm">Signal State:</span>
                  <p className={`text-lg ${stateDisplay.className}`}>
                    {stateDisplay.emoji} {stateDisplay.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
