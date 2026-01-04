import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrafficSignal, Ambulance, calculateDistance, RouteDirection } from '@/types/database';

const PREPARE_DISTANCE = 1000; // 1 km
const ACTIVATE_DISTANCE = 250; // 250 meters

export function useTrafficSignals() {
  const [signals, setSignals] = useState<TrafficSignal[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all traffic signals
  const fetchSignals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('traffic_signals')
        .select('*')
        .order('signal_name');

      if (error) throw error;
      setSignals(data as TrafficSignal[]);
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('traffic-signals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'traffic_signals',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSignals(prev => 
              prev.map(s => s.id === payload.new.id ? payload.new as TrafficSignal : s)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSignals]);

  // Update signal based on ambulance proximity
  const updateSignalForAmbulance = async (
    signal: TrafficSignal,
    ambulance: Ambulance,
    distance: number
  ) => {
    let newStatus: 'normal' | 'prepare' | 'priority' = 'normal';
    let directionNs = 'RED';
    let directionSn = 'RED';
    let directionEw = 'RED';
    let directionWe = 'RED';

    // Determine signal status based on distance
    const isEmergencyActive = ambulance.emergency_status === 'active' || ambulance.emergency_status === 'responding';
    
    if (distance <= ACTIVATE_DISTANCE && isEmergencyActive) {
      newStatus = 'priority';
    } else if (distance <= PREPARE_DISTANCE && isEmergencyActive) {
      newStatus = 'prepare';
    } else {
      newStatus = 'normal';
    }

    // Set directions based on ambulance route and status
    if (newStatus !== 'normal' && ambulance.route_direction) {
      switch (ambulance.route_direction) {
        case 'N_S':
          directionNs = newStatus === 'priority' ? 'GREEN' : 'BLINK_GREEN';
          directionSn = 'RED';
          directionEw = 'RED';
          directionWe = 'RED';
          break;
        case 'S_N':
          directionNs = 'RED';
          directionSn = newStatus === 'priority' ? 'GREEN' : 'BLINK_GREEN';
          directionEw = 'RED';
          directionWe = 'RED';
          break;
        case 'E_W':
          directionNs = 'RED';
          directionSn = 'RED';
          directionEw = newStatus === 'priority' ? 'GREEN' : 'BLINK_GREEN';
          directionWe = 'RED';
          break;
        case 'W_E':
          directionNs = 'RED';
          directionSn = 'RED';
          directionEw = 'RED';
          directionWe = newStatus === 'priority' ? 'GREEN' : 'BLINK_GREEN';
          break;
      }
    } else {
      // Normal traffic pattern
      directionNs = 'GREEN';
      directionSn = 'GREEN';
      directionEw = 'RED';
      directionWe = 'RED';
    }

    try {
      const { error } = await supabase
        .from('traffic_signals')
        .update({
          current_status: newStatus,
          direction_ns: directionNs,
          direction_sn: directionSn,
          direction_ew: directionEw,
          direction_we: directionWe,
          priority_direction: newStatus !== 'normal' ? ambulance.route_direction : null,
          activated_by: newStatus !== 'normal' ? ambulance.id : null,
          last_updated: new Date().toISOString(),
        })
        .eq('id', signal.id);

      if (error) throw error;

      // Log activation if status changed to prepare or priority
      if (newStatus !== 'normal' && newStatus !== signal.current_status) {
        await supabase
          .from('signal_activations')
          .insert({
            signal_id: signal.id,
            ambulance_id: ambulance.id,
            activation_type: newStatus,
            distance_meters: distance,
          });
      }
    } catch (error) {
      console.error('Error updating signal:', error);
    }
  };

  // Check all signals against ambulance position
  const checkSignalsForAmbulance = useCallback(async (ambulance: Ambulance) => {
    const isEmergencyActive = ambulance.emergency_status === 'active' || ambulance.emergency_status === 'responding';
    if (!isEmergencyActive) return;

    for (const signal of signals) {
      const distance = calculateDistance(
        ambulance.current_lat,
        ambulance.current_lng,
        signal.location_lat,
        signal.location_lng
      );

      await updateSignalForAmbulance(signal, ambulance, distance);
    }
  }, [signals]);

  // Reset all signals to normal
  const resetAllSignals = async () => {
    try {
      const { error } = await supabase
        .from('traffic_signals')
        .update({
          current_status: 'normal',
          direction_ns: 'GREEN',
          direction_sn: 'GREEN',
          direction_ew: 'RED',
          direction_we: 'RED',
          priority_direction: null,
          activated_by: null,
          last_updated: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

      if (error) throw error;
      await fetchSignals();
    } catch (error) {
      console.error('Error resetting signals:', error);
    }
  };

  return {
    signals,
    loading,
    checkSignalsForAmbulance,
    resetAllSignals,
    refreshSignals: fetchSignals,
  };
}
